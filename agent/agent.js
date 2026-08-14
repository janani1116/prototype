const { connect } = require("nats");
const { v4: uuid } = require("uuid");

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";

async function sendCommand() {
  const nc = await connect({ servers: NATS_URL });
  console.log("Agent connected to NATS", NATS_URL);

  const envelope = {
    message_id: uuid(),
    timestamp: new Date().toISOString(),
    sender_agent_id: "agent:1",
    message_type: "COMMAND",
    payload: {
      tool: "echo_tool",
      args: { text: "Hello from agent prototype" },
      estimated_cost: 10
    },
    provenance: {
      origin: "market-data-collector",
      collection_hash: "sha256:examplehash",
      consent_pointer: "consent:tx123"
    }
  };

  const subj = "agents.commands";
  await nc.publish(subj, Buffer.from(JSON.stringify(envelope)));
  console.log("Published command envelope to", subj);
  await nc.drain();
}

sendCommand().catch(err => {
  console.error("Agent error", err);
  process.exit(1);
});
