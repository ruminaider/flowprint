export async function extractOrderData(order) {
  return {
    line_items: order.line_items,
    email: order.email,
    shipping_address: order.shipping_address,
  }
}
