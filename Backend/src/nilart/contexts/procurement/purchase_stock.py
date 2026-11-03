"""Compatibility exports for purchase-owned stock commands."""
from nilart.contexts.inventory.document_stock import DocumentStockError as PurchaseError
from nilart.contexts.inventory.document_stock import move_stock

__all__ = ["PurchaseError", "move_stock"]
