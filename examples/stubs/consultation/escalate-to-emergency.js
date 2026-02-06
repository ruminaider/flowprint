export function escalate_to_emergency() {
  return { escalated: true }
}

export function cancel_escalation() {
  return { cancelled: true }
}
