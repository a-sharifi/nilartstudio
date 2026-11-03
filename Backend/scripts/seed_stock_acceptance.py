"""Explicit synthetic catalogue + customer for an isolated DB-backed checkout."""

import json
import sys
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import create_engine, text

from nilart.bootstrap.settings import settings

if "--demo-only" not in sys.argv:
    raise SystemExit("Explicit --demo-only is required for synthetic acceptance data")
engine = create_engine(settings.database_url)
with engine.begin() as db:
    assert db.scalar(text("SELECT current_database()")) == "nilart_demo", (
        "Isolated nilart_demo database required"
    )
    admin = (
        db.execute(
            text("SELECT id,password_hash FROM identity_accounts WHERE phone='+989121110001'")
        )
        .mappings()
        .one()
    )
    customer, product, sku, address = [uuid4() for _ in range(4)]
    tag = uuid4().hex[:8]
    phone = "+98912" + str(int(tag, 16)).zfill(9)[-7:]
    db.execute(
        text(
            "INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) VALUES(:id,:phone,:password,true,false,:now)"
        ),
        {
            "id": customer,
            "phone": phone,
            "password": admin["password_hash"],
            "now": datetime.now(UTC),
        },
    )
    db.execute(
        text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'customer')"),
        {"id": customer},
    )
    db.execute(
        text(
            "INSERT INTO catalog_products(id,slug,title_fa,title_en,published) VALUES(:id,:slug,'کالای آزمایش رزرو','Reservation test product',true)"
        ),
        {"id": product, "slug": "stock-live-" + tag},
    )
    db.execute(
        text(
            "INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES(:id,:product,:code,true,100,'IRT')"
        ),
        {"id": sku, "product": product, "code": "RSV-" + tag},
    )
    db.execute(
        text(
            "INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'address',CAST(:data AS jsonb))"
        ),
        {
            "id": address,
            "owner": customer,
            "data": json.dumps(
                {
                    "name": "Sandbox reservation customer",
                    "phone": phone,
                    "label": "Demo",
                    "default": True,
                    "province": "Test",
                    "city": "Test",
                    "street": "Isolated stock test",
                    "postal": "1234567890",
                }
            ),
        },
    )
    print(
        json.dumps(
            {
                "phone": phone,
                "customer": str(customer),
                "sku": str(sku),
                "address": str(address),
                "product": str(product),
                "tag": tag,
            }
        )
    )
