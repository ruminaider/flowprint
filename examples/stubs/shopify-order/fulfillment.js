export async function sendToBerlin(order) {
  return { fulfillment_id: `ber-${order.order_id}`, status: 'sent' }
}
