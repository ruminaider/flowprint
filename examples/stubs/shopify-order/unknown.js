export async function processUnknownSku(order) {
  return { order_id: order.order_id, status: 'flagged_for_review' }
}
