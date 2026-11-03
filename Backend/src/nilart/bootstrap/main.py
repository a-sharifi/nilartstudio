import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from redis import Redis
from sqlalchemy import create_engine, text
from starlette.exceptions import HTTPException

from nilart.bootstrap.settings import settings
from nilart.contexts.basket.router import router as basket_router
from nilart.contexts.business.router import router as business_settings_router
from nilart.contexts.catalog.presentation.artwork_authoring import (
    router as artwork_authoring_router,
)
from nilart.contexts.catalog.presentation.artworks import router as artworks_router
from nilart.contexts.catalog.presentation.authoring import router as catalog_management_router
from nilart.contexts.catalog.presentation.bundle_authoring import (
    public_router as bundle_gallery_router,
)
from nilart.contexts.catalog.presentation.bundle_authoring import router as bundle_authoring_router
from nilart.contexts.catalog.presentation.bundles import router as bundles_router
from nilart.contexts.catalog.presentation.options import router as options_router
from nilart.contexts.catalog.presentation.prices import router as prices_router
from nilart.contexts.catalog.presentation.product_workspace import (
    router as product_workspace_router,
)
from nilart.contexts.catalog.presentation.profiles import (
    public_router as public_catalog_profiles_router,
)
from nilart.contexts.catalog.presentation.profiles import router as catalog_profiles_router
from nilart.contexts.catalog.presentation.router import router as catalog_router
from nilart.contexts.catalog.presentation.sku_authoring import router as sku_authoring_router
from nilart.contexts.catalog.presentation.sku_mappings import router as sku_mappings_router
from nilart.contexts.channels.router import router as channels_router
from nilart.contexts.channels.router import webhook_router as channel_webhooks_router
from nilart.contexts.commissions.notebooks import router as notebook_designs_router
from nilart.contexts.commissions.router import admin_router as commission_admin_router
from nilart.contexts.commissions.router import router as commissions_router
from nilart.contexts.content.router import public_router as public_content_router
from nilart.contexts.content.router import router as content_router
from nilart.contexts.costing.pricing import router as pricing_router
from nilart.contexts.costing.recipes import router as recipes_router
from nilart.contexts.costing.router import router as costing_router
from nilart.contexts.customer.attachments import admin_router as attachments_admin_router
from nilart.contexts.customer.attachments import router as attachments_router
from nilart.contexts.customer.router import admin_router as customer_admin_router
from nilart.contexts.customer.router import router as customer_router
from nilart.contexts.discounts.quote import router as discount_quote_router
from nilart.contexts.discounts.router import router as discounts_router
from nilart.contexts.files.router import admin_router as files_admin_router
from nilart.contexts.files.router import router as files_router
from nilart.contexts.finance.opening_settlements import router as opening_settlements_router
from nilart.contexts.finance.router import router as finance_router
from nilart.contexts.finance.simple import router as simple_commerce_router
from nilart.contexts.finance.supplier_balances import router as supplier_balances_router
from nilart.contexts.finance.supplier_openings import router as supplier_openings_router
from nilart.contexts.finance.supplier_statements import router as supplier_statements_router
from nilart.contexts.fulfillment.returns import customer_router as return_tracking_router
from nilart.contexts.fulfillment.returns import router as return_inspections_router
from nilart.contexts.fulfillment.router import customer_router as shipment_tracking_router
from nilart.contexts.fulfillment.router import router as fulfillment_router
from nilart.contexts.geography.router import router as geography_router
from nilart.contexts.identity.presentation.access import router as access_router
from nilart.contexts.identity.presentation.management import router as management_router
from nilart.contexts.identity.presentation.otp_router import router as otp_router
from nilart.contexts.identity.presentation.phone_change import router as phone_router
from nilart.contexts.identity.presentation.profile import router as profile_router
from nilart.contexts.identity.presentation.router import router as identity_router
from nilart.contexts.identity.presentation.security import router as security_router
from nilart.contexts.inventory.order_stock import router as order_stock_router
from nilart.contexts.inventory.resolution_reviews import router as resolution_reviews_router
from nilart.contexts.inventory.router import router as inventory_router
from nilart.contexts.media.router import public_router as public_media_router
from nilart.contexts.mockups.router import public_router as public_mockups_router
from nilart.contexts.mockups.router import router as mockups_router
from nilart.contexts.media.router import router as media_router
from nilart.contexts.orders.cancellations import router as cancellations_router
from nilart.contexts.orders.financial_closures import router as financial_closures_router
from nilart.contexts.orders.review_router import router as order_review_router
from nilart.contexts.orders.router import admin_router as admin_orders_router
from nilart.contexts.orders.router import requests_router
from nilart.contexts.orders.router import router as orders_router
from nilart.contexts.orders.summary import router as order_summary_router
from nilart.contexts.payments.admin import router as admin_payments_router
from nilart.contexts.payments.refunds import customer_router as customer_refunds_router
from nilart.contexts.payments.refunds import router as refunds_router
from nilart.contexts.payments.router import router as payments_router
from nilart.contexts.procurement.purchases import router as purchases_router
from nilart.contexts.procurement.suppliers import router as suppliers_router
from nilart.contexts.production.router import router as production_router
from nilart.contexts.reporting.router import router as reports_router
from nilart.contexts.shipping.router import router as tapin_router

logger = logging.getLogger("nilart")
app = FastAPI(title="Nilart API", version="0.1.0")
app.include_router(catalog_router)
app.include_router(catalog_management_router)
app.include_router(product_workspace_router)
app.include_router(bundles_router)
app.include_router(bundle_authoring_router)
app.include_router(catalog_profiles_router)
app.include_router(artwork_authoring_router)
app.include_router(public_catalog_profiles_router)
app.include_router(bundle_gallery_router)
app.include_router(commissions_router)
app.include_router(commission_admin_router)
app.include_router(artworks_router)
app.include_router(options_router)
app.include_router(prices_router)
app.include_router(sku_authoring_router)
app.include_router(sku_mappings_router)
app.include_router(identity_router)
app.include_router(access_router)
app.include_router(otp_router)
app.include_router(costing_router)
app.include_router(suppliers_router)
app.include_router(discounts_router)
app.include_router(discount_quote_router)
app.include_router(recipes_router)
app.include_router(pricing_router)
app.include_router(basket_router)
app.include_router(business_settings_router)
app.include_router(purchases_router)
app.include_router(production_router)
app.include_router(finance_router)
app.include_router(opening_settlements_router)
app.include_router(supplier_balances_router)
app.include_router(supplier_openings_router)
app.include_router(supplier_statements_router)
app.include_router(reports_router)
app.include_router(inventory_router)
app.include_router(content_router)
app.include_router(media_router)
app.include_router(public_media_router)
app.include_router(mockups_router)
app.include_router(public_mockups_router)
app.include_router(public_content_router)
app.include_router(profile_router)
app.include_router(management_router)
app.include_router(security_router)
app.include_router(phone_router)
app.include_router(customer_router)
app.include_router(attachments_router)
app.include_router(attachments_admin_router)
app.include_router(files_router)
app.include_router(files_admin_router)
app.include_router(orders_router)
app.include_router(admin_orders_router)
app.include_router(requests_router)
app.include_router(order_review_router)

app.include_router(financial_closures_router)
app.include_router(cancellations_router)
app.include_router(order_summary_router)
app.include_router(customer_admin_router)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = str(uuid4())
    response = await call_next(request)
    # Validation and routing failures bypass individual private endpoint handlers.
    if any(
        request.url.path == prefix or request.url.path.startswith(prefix + "/")
        for prefix in ("/api/v1/auth", "/api/v1/account", "/api/v1/admin", "/api/v1/artist")
    ):
        response.headers["Cache-Control"] = "no-store"
    response.headers["X-Request-ID"] = request.state.request_id
    logger.info(
        "request",
        extra={
            "request_id": request.state.request_id,
            "path": request.url.path,
            "status": response.status_code,
        },
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "code": "validation_error",
            "request_id": request.state.request_id,
            "fields": [{"path": list(e["loc"]), "code": e["type"]} for e in exc.errors()],
        },
    )


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    identity_code = exc.detail.get("code") if isinstance(exc.detail, dict) else None
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "code": identity_code
            if isinstance(identity_code, str)
            else "not_found"
            if exc.status_code == 404
            else "http_error",
            "detail": exc.detail,
            "request_id": request.state.request_id,
        },
    )


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    request_id = request.state.request_id
    # Exception messages and traces can contain credentials or submitted data.
    logger.error(
        "unexpected_error", extra={"request_id": request_id, "error_type": type(exc).__name__}
    )
    return JSONResponse(
        status_code=500,
        content={"code": "internal_error", "request_id": request_id},
        headers={"Cache-Control": "no-store", "X-Request-ID": request_id},
    )


@app.get("/api/v1/health/live")
def live():
    return {"status": "ok", "environment": settings.environment}


@app.get("/api/v1/health/ready")
def ready():
    engine = create_engine(settings.database_url, connect_args={"connect_timeout": 2})
    cache = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        cache.ping()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not_ready"})
    finally:
        engine.dispose()
        cache.close()
    return {"status": "ready"}


app.include_router(geography_router)

app.include_router(payments_router)
app.include_router(admin_payments_router)
app.include_router(refunds_router)
app.include_router(customer_refunds_router)

app.include_router(order_stock_router)
app.include_router(resolution_reviews_router)

app.include_router(return_inspections_router)
app.include_router(return_tracking_router)
app.include_router(fulfillment_router)
app.include_router(tapin_router)
app.include_router(notebook_designs_router)
app.include_router(channels_router)
app.include_router(channel_webhooks_router)
app.include_router(shipment_tracking_router)

app.include_router(simple_commerce_router)

from nilart.contexts.marketing.router import router as marketing_router, public_router as public_marketing_router
app.include_router(marketing_router)
app.include_router(public_marketing_router)

from nilart.contexts.analytics.router import router as shop_dashboard_router
app.include_router(shop_dashboard_router)
