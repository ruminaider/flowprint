"""Sample Python module for entry point testing."""


def process_order(order_id: str) -> dict:
    """Process an order."""
    return {"id": order_id, "status": "processed"}


class OrderService:
    """Service for managing orders."""

    def __init__(self):
        self.orders = []

    def create(self, data):
        self.orders.append(data)


async def async_handler(request):
    """An async request handler."""
    return {"ok": True}
