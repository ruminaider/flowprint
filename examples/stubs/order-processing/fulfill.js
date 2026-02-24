export async function priorityFulfill(input) {
  return { method: 'priority', status: 'fulfilled', ...input }
}

export async function standardFulfill(input) {
  return { method: 'standard', status: 'fulfilled', ...input }
}
