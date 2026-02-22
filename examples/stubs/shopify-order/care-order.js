export async function processCareOrder(order) {
  return { consult_order_id: `co-${order.order_id}`, status: 'linked' }
}
