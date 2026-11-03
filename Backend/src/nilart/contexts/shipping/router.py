"""Explicit staff carrier actions; no automatic registration, charge, dispatch or delivery."""

import json
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.shipping.tapin import Parcel, Strict, Tapin, TapinError, payload
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/shipping/tapin", tags=["tapin"])


def configured():
    try:
        UUID(settings.tapin_shop_id)
        return bool(settings.tapin_token)
    except ValueError:
        return False


def client():
    if not settings.tapin_enabled:
        raise TapinError("tapin_disabled")
    if not configured():
        raise TapinError("tapin_not_configured")
    return Tapin(settings.tapin_token.get_secret_value())


def output(row):
    if not row:
        return None
    # Neither recipient data nor raw provider messages appear in status responses.
    return {
        key: row[key]
        for key in (
            "shipment_id",
            "operation_id",
            "state",
            "provider_order_id",
            "barcode",
            "provider_status",
            "error_code",
            "updated_at",
        )
    }


@router.get("/configuration")
def configuration(response: Response, principal=Depends(require_permission("fulfillment.manage"))):
    response.headers["Cache-Control"] = "no-store"
    return dict(enabled=settings.tapin_enabled, configured=configured())


@router.post("/connection")
def connection(
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    db.commit()  # Never hold account locks over a provider request.
    try:
        result = client().shop(settings.tapin_shop_id)
        response.headers["Cache-Control"] = "no-store"
        return result
    except TapinError as error:
        return failure(request, error.code, 409)


class Registration(Strict):
    expected_version: int = Field(strict=True, ge=0)
    parcel: Parcel
    reason: str = Field(min_length=5, max_length=1000)
    confirmed: bool = Field(strict=True)


@router.get("/shipments/{id}")
def detail(
    id: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    if not db.scalar(text("SELECT id FROM fulfillment_shipments WHERE id=:id"), dict(id=id)):
        return failure(request, "shipment_not_found", 404)
    row = (
        db.execute(
            text(
                "SELECT * FROM tapin_shipments WHERE shipment_id=:id ORDER BY created_at DESC,operation_id DESC LIMIT 1"
            ),
            dict(id=id),
        )
        .mappings()
        .first()
    )
    response.headers["Cache-Control"] = "no-store"
    return output(row)


@router.put("/shipments/{id}/operations/{operation}")
def register(
    id: UUID,
    operation: UUID,
    body: Registration,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    if not body.confirmed:
        return failure(request, "tapin_confirmation_required", 422)
    try:
        provider = client()
    except TapinError as error:
        return failure(request, error.code, 409)
    intent = body.model_dump(mode="json")
    db.execute(text("SELECT pg_advisory_xact_lock(78214,58)"))
    prior = (
        db.execute(
            text("SELECT * FROM tapin_shipments WHERE operation_id=:key"), dict(key=operation)
        )
        .mappings()
        .first()
    )
    if prior:
        if (
            prior["shipment_id"] != id
            or prior["operation_id"] != operation
            or prior["intent"] != intent
            or str(prior["actor_id"]) != str(actor.id)
        ):
            return failure(request, "tapin_operation_conflict", 409)
        return output(prior)  # Sending/unknown never automatically retries a creation.
    if db.scalar(
        text(
            "SELECT operation_id FROM tapin_shipments WHERE shipment_id=:id AND state!='rejected'"
        ),
        dict(id=id),
    ):
        return failure(request, "tapin_registration_unconfirmed", 409)
    order_id = db.scalar(
        text("SELECT order_id FROM fulfillment_shipments WHERE id=:id"), dict(id=id)
    )
    if not order_id:
        return failure(request, "shipment_not_found", 404)
    order = (
        db.execute(text("SELECT * FROM customer_orders WHERE id=:id FOR UPDATE"), dict(id=order_id))
        .mappings()
        .one()
    )
    shipment = (
        db.execute(text("SELECT * FROM fulfillment_shipments WHERE id=:id FOR UPDATE"), dict(id=id))
        .mappings()
        .one()
    )
    if order["sandbox"]:
        return failure(request, "tapin_sandbox_order_blocked", 409)
    cancellation = db.scalar(
        text(
            "SELECT id FROM customer_order_requests WHERE order_id=:id AND kind='cancellation' AND status IN ('submitted','in_review','approved')"
        ),
        dict(id=order["id"]),
    )
    if (
        cancellation
        or shipment["status"] != "packed"
        or shipment["version"] != body.expected_version
        or order["state"]["payment"] not in ("paid", "partially_refunded")
        or order["state"]["fulfillment"] == "cancelled"
    ):
        return failure(request, "tapin_shipment_not_eligible", 409)
    try:
        wire = payload(
            settings.tapin_shop_id,
            id,
            order["snapshot"],
            shipment["content"]["quantities"],
            body.parcel,
        )
    except TapinError as error:
        return failure(request, error.code, 422)
    if (
        sum(p["count"] * p["weight"] for p in wire["products"]) + wire["package_weight"]
        != shipment["state"]["packing"]["weight_grams"]
    ):
        return failure(request, "tapin_packed_weight_mismatch", 422)
    actor_id = actor.id
    db.execute(
        text(
            "INSERT INTO tapin_shipments(shipment_id,operation_id,actor_id,shop_id,intent,payload,state) VALUES(:id,:key,:actor,:shop,CAST(:intent AS jsonb),CAST(:payload AS jsonb),'sending')"
        ),
        dict(
            id=id,
            key=operation,
            actor=actor_id,
            shop=settings.tapin_shop_id,
            intent=json.dumps(intent),
            payload=json.dumps(wire),
        ),
    )
    SqlAccountManagement(db).audit(
        actor_id,
        actor_id,
        "shipping.tapin_requested",
        dict(shipment_id=str(id), operation_id=str(operation)),
        body.reason,
    )
    db.commit()
    try:
        shop = provider.shop(settings.tapin_shop_id)
        if not shop["active"]:
            raise TapinError("tapin_shop_inactive")
        result = provider.register(wire)
        state, error = "registered", None
    except TapinError as exc:
        result = {}
        state, error = ("unknown" if exc.uncertain else "rejected"), exc.code
    db.execute(
        text(
            "UPDATE tapin_shipments SET state=:state,provider_order_id=:provider,barcode=:barcode,provider_status=:status,error_code=:error,updated_at=now() WHERE operation_id=:key AND state='sending'"
        ),
        dict(
            key=operation,
            state=state,
            provider=result.get("order_id"),
            barcode=result.get("barcode"),
            status=result.get("status"),
            error=error,
        ),
    )
    SqlAccountManagement(db).audit(
        actor_id,
        actor_id,
        "shipping.tapin_result",
        dict(shipment_id=str(id), state=state),
        body.reason,
    )
    db.commit()
    return output(
        db.execute(
            text("SELECT * FROM tapin_shipments WHERE operation_id=:key"), dict(key=operation)
        )
        .mappings()
        .one()
    )


@router.post("/shipments/{id}/refresh")
def refresh(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    row = (
        db.execute(
            text(
                "SELECT * FROM tapin_shipments WHERE shipment_id=:id ORDER BY created_at DESC,operation_id DESC LIMIT 1"
            ),
            dict(id=id),
        )
        .mappings()
        .first()
    )
    if not row or row["state"] != "registered":
        return failure(request, "tapin_registration_unconfirmed", 409)
    order_id, shop = row["provider_order_id"], row["shop_id"]
    db.commit()
    try:
        provider = client()
        if str(shop) != settings.tapin_shop_id:
            raise TapinError("tapin_shop_changed")
        result = provider.detail(shop, order_id)
        barcode = result.get("barcode") or None
        if barcode is not None and (not isinstance(barcode, str) or len(barcode) > 100):
            raise TapinError("tapin_invalid_response")
    except TapinError as error:
        return failure(request, error.code, 409)
    db.execute(
        text(
            "UPDATE tapin_shipments SET provider_status=:status,barcode=:barcode,updated_at=now() WHERE shipment_id=:id AND state='registered'"
        ),
        dict(id=id, status=result["status"], barcode=barcode),
    )
    db.commit()
    return output(
        db.execute(
            text(
                "SELECT * FROM tapin_shipments WHERE shipment_id=:id ORDER BY created_at DESC,operation_id DESC LIMIT 1"
            ),
            dict(id=id),
        )
        .mappings()
        .one()
    )


class Recovery(Strict):
    operation_id: UUID
    provider_order_id: int = Field(strict=True, ge=1)
    verified_in_panel: bool = Field(strict=True)
    reason: str = Field(min_length=5, max_length=1000)


@router.post("/shipments/{id}/reconcile")
def reconcile(
    id: UUID,
    body: Recovery,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    from nilart.contexts.shipping.tapin import same_parcel

    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    if not body.verified_in_panel:
        return failure(request, "tapin_confirmation_required", 422)
    row = (
        db.execute(
            text(
                "SELECT * FROM tapin_shipments WHERE shipment_id=:id AND operation_id=:key AND state IN ('sending','unknown')"
            ),
            dict(id=id, key=body.operation_id),
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "tapin_reconciliation_conflict", 409)
    if str(row["shop_id"]) != settings.tapin_shop_id:
        return failure(request, "tapin_shop_changed", 409)
    actor_id = actor.id
    db.commit()
    try:
        result = client().detail(row["shop_id"], body.provider_order_id)
        if result.get("manual_id") is not None and str(result["manual_id"]) != str(id):
            raise TapinError("tapin_reconciliation_mismatch")
        if not same_parcel(row["payload"], result):
            raise TapinError("tapin_reconciliation_mismatch")
        barcode = result.get("barcode") or None
        if barcode is not None and (not isinstance(barcode, str) or len(barcode) > 100):
            raise TapinError("tapin_invalid_response")
    except TapinError as error:
        return failure(request, error.code, 409)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,58)"))
    if db.scalar(
        text("SELECT shipment_id FROM tapin_shipments WHERE provider_order_id=:provider"),
        dict(provider=body.provider_order_id),
    ):
        return failure(request, "tapin_reconciliation_conflict", 409)
    updated = (
        db.execute(
            text(
                "UPDATE tapin_shipments SET state='registered',provider_order_id=:provider,provider_status=:status,barcode=:barcode,error_code=NULL,updated_at=now() WHERE operation_id=:key AND state IN ('sending','unknown') RETURNING *"
            ),
            dict(
                key=body.operation_id,
                provider=body.provider_order_id,
                status=result["status"],
                barcode=barcode,
            ),
        )
        .mappings()
        .first()
    )
    if not updated:
        return failure(request, "tapin_reconciliation_conflict", 409)
    SqlAccountManagement(db).audit(
        actor_id,
        actor_id,
        "shipping.tapin_reconciled",
        dict(
            shipment_id=str(id),
            operation_id=str(body.operation_id),
            provider_order_id=body.provider_order_id,
        ),
        body.reason,
    )
    db.commit()
    return output(updated)


@router.get("/shipments/{id}/label")
def label(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    row = (
        db.execute(
            text("SELECT * FROM tapin_shipments WHERE shipment_id=:id AND state='registered'"),
            dict(id=id),
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "tapin_registration_unconfirmed", 409)
    if str(row["shop_id"]) != settings.tapin_shop_id:
        return failure(request, "tapin_shop_changed", 409)
    db.commit()
    try:
        provider = client()
        remote = provider.detail(row["shop_id"], row["provider_order_id"])
        document = provider.label(row["shop_id"], UUID(remote["id"]))
    except (TapinError, ValueError, KeyError) as error:
        return failure(
            request, error.code if isinstance(error, TapinError) else "tapin_invalid_response", 409
        )
    return Response(
        document,
        media_type="text/html",
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": f'attachment; filename="tapin-{id}.html"',
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'",
        },
    )


@router.post("/reference-data")
def reference_data(
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    _, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    db.commit()
    try:
        provider = client()
        provinces = provider.call("state/tree/", {})
        boxes = provider.call("order/post/packing-box/", {"shop_id": settings.tapin_shop_id})
        if (
            not isinstance(provinces, list)
            or not isinstance(boxes, dict)
            or not isinstance(boxes.get("list"), list)
        ):
            raise TapinError("tapin_invalid_response")
        # Return only fields required by the selection controls.
        result = {
            "provinces": [
                {
                    "code": int(p["code"]),
                    "title": str(p["title"]),
                    "cities": [
                        {"code": int(c["code"]), "title": str(c["title"])} for c in p["cities"]
                    ],
                }
                for p in provinces
            ],
            "boxes": [{"code": int(b["pk"]), "title": str(b["title"])} for b in boxes["list"]],
        }
        response.headers["Cache-Control"] = "no-store"
        return result
    except (TapinError, ValueError, KeyError, TypeError) as error:
        return failure(
            request, error.code if isinstance(error, TapinError) else "tapin_invalid_response", 409
        )


@router.post("/shipments/{id}/quote")
def quote(
    id: UUID,
    body: Registration,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("fulfillment.manage")),
):
    from decimal import Decimal, InvalidOperation

    _, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    row = (
        db.execute(
            text(
                "SELECT s.*,o.snapshot,o.sandbox FROM fulfillment_shipments s JOIN customer_orders o ON o.id=s.order_id WHERE s.id=:id"
            ),
            dict(id=id),
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "shipment_not_found", 404)
    if row["sandbox"]:
        return failure(request, "tapin_sandbox_order_blocked", 409)
    if row["version"] != body.expected_version or row["status"] != "packed":
        return failure(request, "tapin_shipment_not_eligible", 409)
    try:
        wire = payload(
            settings.tapin_shop_id, id, row["snapshot"], row["content"]["quantities"], body.parcel
        )
        if (
            sum(p["count"] * p["weight"] for p in wire["products"]) + wire["package_weight"]
            != row["state"]["packing"]["weight_grams"]
        ):
            raise TapinError("tapin_packed_weight_mismatch")
        db.commit()
        wire.pop("register_type")
        wire.pop("manual_id")
        r = client().call("order/post/check-price/", wire)
        amount = Decimal(str(r["total_price"]))
        if not amount.is_finite() or amount < 0:
            raise ValueError()
        return {"amount_rial": format(amount, "f"), "weight_grams": int(r["total_weight"])}
    except (TapinError, ValueError, KeyError, InvalidOperation, TypeError) as error:
        return failure(
            request, error.code if isinstance(error, TapinError) else "tapin_invalid_response", 409
        )
