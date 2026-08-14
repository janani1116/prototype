const { connect } = require("nats");
const Ajv = require("ajv");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const winston = require("winston");

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const OPA_URL = (process.env.OPA_URL || "http://localhost:8181").replace(/\/+$, "");

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

async function main() {
  // load schema
  const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "message_schema.json")));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);

  // connect nats
  const nc = await connect({ servers: NATS_URL });
  logger.info("Connected to NATS", { NATS_URL });

  const sub = nc.subscribe("agents.commands");
  logger.info("Subscribed to agents.commands");

  for await (const msg of sub) {
    const txt = msg.data.toString();
    logger.info("Received raw message", { txt });
    let envelope;
    try {
      envelope = JSON.parse(txt);
    } catch (e) {
      logger.error("Invalid JSON", { err: e.message });
      continue;
    }

    // schema validation
    const valid = validate(envelope);
    if (!valid) {
      logger.error("Schema validation failed", { errors: validate.errors });
      await writeAudit({ action: "schema_invalid", envelope, errors: validate.errors });
      continue;
    }

    // Build OPA input
    const opaInput = {
      agent_id: envelope.sender_agent_id,
      tool: envelope.payload.tool,
      provenance: envelope.provenance,
      estimated_cost: envelope.payload.estimated_cost || 0
    };

    try {
      const res = await axios.post(`${OPA_URL}/v1/data/gateway/authz/allow`, { input: opaInput });
      const allowed = res.data.result === true;
      await writeAudit({ action: "policy_decision", envelope, opaInput, allowed });

      if (!allowed) {
        logger.warn("OPA denied request", { agent: envelope.sender_agent_id, tool: envelope.payload.tool });
        continue;
      }

      // Enforcement: simple simulated execution of tool "echo_tool"
      if (envelope.payload.tool === "echo_tool") {
        const result = { status: "ok", echo: envelope.payload.args || null };
        logger.info("Executed echo_tool", { result });
        await writeAudit({ action: "tool_executed", envelope, result });
      } else {
        logger.warn("Unknown tool", { tool: envelope.payload.tool });
        await writeAudit({ action: "unknown_tool", envelope });
      }
    } catch (err) {
      logger.error("Error calling OPA or executing", { err: err.message });
      await writeAudit({ action: "error", envelope, err: err.message });
    }
  }
}

async function writeAudit(entry) {
  const auditPath = path.join(__dirname, "audit.log");
  const record = {
    ts: new Date().toISOString(),
    ...entry
  };
  fs.appendFileSync(auditPath, JSON.stringify(record) + "\n");
}

main().catch(err => {
  console.error("Gateway fatal error", err);
  process.exit(1);
});
