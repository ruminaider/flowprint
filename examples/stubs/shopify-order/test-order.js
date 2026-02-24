export async function createTestRecord(order) {
  return { test_id: `test-${order.order_id}`, status: 'created' }
}
