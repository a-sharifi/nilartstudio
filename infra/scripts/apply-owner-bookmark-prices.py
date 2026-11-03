"""Owner instruction: bookmark sale 150,000 IRT, inventory one unit at 30,000 IRT cost.
Run inside the API application environment. Audited writes; no historical rewrites.
"""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request

from nilart.shared.database import engine
from nilart.contexts.catalog.infrastructure.prices import SqlSKUPriceRepository
from nilart.contexts.inventory.router import Command
from nilart.contexts.inventory.service import apply_adjustment

with Session(engine) as db:
    actor = db.scalar(text("SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1"))
    if not actor:
        raise RuntimeError('An existing administrator is required')
    rows = db.execute(text("SELECT s.id,s.code FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE p.slug LIKE '%bookmark%' ORDER BY s.code")).mappings().all()
    if not rows:
        raise RuntimeError('No bookmark variants found')
    for sku in rows:
        repo = SqlSKUPriceRepository(db)
        old = repo.read(sku['id'])
        if not old['price'] or Decimal(old['price']['amount']) != 150000 or old['price']['currency'] != 'IRT':
            repo.save(sku['id'], actor, old['version'], dict(amount=Decimal(150000), currency='IRT'))
        row = db.execute(text("SELECT * FROM inventory_positions WHERE kind='sku' AND reference_id=:id FOR UPDATE"),dict(id=sku['id'])).mappings().first()
        if row and row['reserved'] > 1:
            raise RuntimeError('Reserved stock exceeds the requested opening balance')
        quantity = row['quantity'] if row else Decimal(0)
        version = row['version'] if row else 0
        def apply(action, quantity='0', value=None):
            global version
            body = Command(kind='sku', reference_id=sku['id'], expected_version=version, action=action, quantity=quantity, value=value, reason='Owner confirmed bookmark sale 150000 toman, purchase cost 30000 toman, one unit per design')
            result = apply_adjustment(db, SimpleNamespace(id=actor), Request({'type':'http','headers':[]}), uuid4(), body, commit=False)
            if not isinstance(result, dict):
                raise RuntimeError('Inventory adjustment rejected')
            version += 1
        if quantity < 1:
            apply('increase' if row else 'opening', str(1-quantity), str((1-quantity)*30000))
        elif quantity > 1:
            apply('decrease', str(quantity-1))
        value = db.scalar(text("SELECT value FROM inventory_positions WHERE kind='sku' AND reference_id=:id"),dict(id=sku['id']))
        if value != Decimal(30000):
            apply('revalue', value='30000')
    db.commit()
    print(f'Updated {len(rows)} bookmark variants: sale 150000 IRT, one unit, valuation 30000 IRT each.')
