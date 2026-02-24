export async function linkConsult(order) {
  return { consult_uid: order.note_attributes?.consult_uid, status: 'linked' }
}

export async function createConsultOrder(order) {
  return { consult_order_id: `co-${order.order_id}`, status: 'created' }
}
