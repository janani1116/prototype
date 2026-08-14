package gateway.authz

# Minimal prototype allow rule:
# Only allow agent "agent:1" to call "echo_tool" with consent "consent:tx123" and cost <= 100
default allow = false

allow {
    input.agent_id == "agent:1"
    input.tool == "echo_tool"
    input.provenance.consent_pointer == "consent:tx123"
    input.estimated_cost <= 100
}
