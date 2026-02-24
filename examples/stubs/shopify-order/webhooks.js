export async function shopifyWebhookHandler(payload) {
  return { order_id: payload.id, topic: payload.topic }
}
