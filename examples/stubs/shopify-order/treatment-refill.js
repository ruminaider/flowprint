export async function resolvePrescriptions(order) {
  return { prescription_ids: [], status: 'resolved' }
}

export async function sendToPharmacy(order) {
  return { pharmacy_task_id: `ptask-${order.order_id}`, status: 'submitted' }
}
