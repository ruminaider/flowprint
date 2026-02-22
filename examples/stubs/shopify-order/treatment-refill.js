export async function processTreatmentRefill(order) {
  return { prescription_id: `rx-${order.order_id}`, status: 'dispatched' }
}
