/**
 * Sample TypeScript module for entry point testing.
 */

export function processOrder(orderId: string): Record<string, string> {
  return { id: orderId, status: 'processed' }
}

export const ORDER_TIMEOUT = 30_000

export class OrderService {
  private orders: string[] = []

  create(data: string): void {
    this.orders.push(data)
  }
}

export async function internalHelper(): Promise<void> {
  // helper for tree-sitter testing
}
