# Agentic prototype: tool-gateway + agent + OPA + NATS

This repository contains a minimal, runnable prototype demonstrating core controls from the OWASP Agentic Security Initiative for a swarm-style multi-agent architecture.

What it includes
- NATS broker (message bus)
- OPA (policy decision point) with a simple allow policy
- tool-gateway: validates message envelope, calls OPA, enforces policy, writes audit.log
- agent: publishes a single command envelope to the broker

Run (requires Docker & docker-compose)
1. From the repository root:
   ```bash
   docker compose up --build
   ```

2. The agent will publish a single test command. The gateway validates the envelope, calls OPA, and if allowed, simulates executing a tool and writes audit entries to `tool-gateway/audit.log` inside the container.

Notes & next steps
- This is a prototype. To align with OWASP ASI for production, replace prototype identity with SPIFFE/mTLS, add message signing and replay protection, integrate a consent-check microservice (blockchain/smart contract), use sandboxed execution (Firecracker/gVisor), and persist signed audit logs to an append-only store.
