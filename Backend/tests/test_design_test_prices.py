from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from nilart.bootstrap.design_catalog import NOTICE_EN, NOTICE_FA
from nilart.bootstrap.design_test_prices import seed_test_prices
from nilart.contexts.catalog.infrastructure.repository import Base, ProductRow, SKURow


def test_test_prices_are_exact_idempotent_and_do_not_overwrite():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        product = ProductRow(id=uuid4(), slug="test", title_fa="تست", title_en="Test", description_fa=NOTICE_FA, description_en=NOTICE_EN, published=True)
        db.add(product)
        db.flush()
        sku = SKURow(id=uuid4(), product_id=product.id, code="TEST-REF-TEST-1", published=True)
        db.add(sku)
        db.commit()
        fixture = [{"code": sku.code, "amount": "245000", "currency": "IRT"}]
        with pytest.raises(RuntimeError), db.begin_nested():
            seed_test_prices(db, fixture)
            raise RuntimeError("rollback")
        db.refresh(sku)
        assert sku.price_amount is None
        seed_test_prices(db, fixture)
        db.commit()
        seed_test_prices(db, fixture)
        assert sku.price_amount == Decimal("245000")
        with pytest.raises(ValueError, match="Never overwrite"):
            seed_test_prices(db, [{**fixture[0], "amount": "1"}])
        assert sku.price_amount == Decimal("245000")
        with pytest.raises(ValueError, match="Expected local"):
            seed_test_prices(db, [{**fixture[0], "code": "real-sku"}])
    engine.dispose()
