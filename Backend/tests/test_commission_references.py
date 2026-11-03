import base64
from io import BytesIO
from uuid import uuid4

from PIL import Image
from sqlalchemy import text
from test_catalog_management import migration
from test_commission_reviews_postgres import prepare
from test_identity_otp_postgres import flow as flow


def test_reference_submission_private_access_validation_and_retry(flow):
    client, db, owner, _ = prepare(flow)
    migration(db.connection(), "0057_commission_references.py")
    content = BytesIO()
    Image.new("RGB", (12,12), "red").save(content,format="WEBP")
    image = dict(id=str(uuid4()),file_name="reference.webp",content_base64=base64.b64encode(content.getvalue()).decode())
    body = dict(submission_id=str(uuid4()),idea="Portrait with a reference",changes="",style="Oil",size="A4",execution="handmade",input_kind="image",primary_reference=image["id"],references=[image])
    saved=client.post("/api/v1/account/commissions",json=body)
    assert saved.status_code==200,saved.text
    commission=saved.json()["id"]
    assert client.post("/api/v1/account/commissions",json=body).json()==saved.json()
    assert db.scalar(text("SELECT count(*) FROM commission_references"))==1
    path=f"/api/v1/account/commissions/{commission}/references/{image['id']}"
    result=client.get(path)
    assert result.status_code==200 and result.content==content.getvalue()
    assert result.headers["cache-control"]=="no-store"
    brief=db.scalar(text("SELECT brief FROM commission_requests WHERE id=:id"),dict(id=commission))
    assert brief["references"][0]["media_type"]=="image/webp"
    assert "content_base64" not in str(brief)
    assert client.get(f"/api/v1/admin/commissions/{commission}/references/{image['id']}").status_code==403
    db.execute(text("INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'commissions.manage',true)"),dict(id=owner))
    assert client.get(f"/api/v1/admin/commissions/{commission}/references/{image['id']}").status_code==200
    db.execute(text("UPDATE identity_permission_overrides SET allowed=false WHERE account_id=:id AND permission='commissions.manage'"),dict(id=owner))
    assert client.get(f"/api/v1/admin/commissions/{commission}/references/{image['id']}").status_code==403
    changed={**body,"references":[{**image,"content_base64":base64.b64encode(b"not an image").decode()}]}
    assert client.post("/api/v1/account/commissions",json=changed).status_code==422
    assert client.post("/api/v1/account/commissions",json={**body,"primary_reference":str(uuid4())}).status_code==422
    assert client.post("/api/v1/account/commissions",json={**body,"references":[]}).status_code==422
    other=uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) VALUES(:id,'+989123456780','unused',true,false,now())"),dict(id=other))
    db.execute(text("UPDATE commission_requests SET account_id=:other WHERE id=:id"),dict(other=other,id=commission))
    assert client.get(path).status_code==404
    client.cookies.clear()
    assert client.get(path).status_code==401


def test_notebook_price_is_server_calculated_and_frozen_on_retry(flow, monkeypatch):
    client, db, owner, _ = prepare(flow)
    migration(db.connection(), "0057_commission_references.py")
    from nilart.contexts.commissions import notebooks
    from decimal import Decimal
    sku=uuid4()
    target=dict(id=sku,code='NOTEBOOK-A5',slug='notebook',title_fa='دفتر',title_en='Notebook',price_amount=Decimal('598000'),currency='IRT')
    monkeypatch.setattr(notebooks,'notebook',lambda db,id:target if id==sku else None)
    quote=notebooks.price_notebook(db,sku,'digital')
    assert quote['total_amount']=='1098000.00'
    assert notebooks.price_notebook(db,sku,'pencil')['total_amount']=='2098000.00'
    body=dict(submission_id=str(uuid4()),idea='My custom notebook',changes='',style='Digital cover',size='A5',execution='digital',notebook_sku_id=str(sku),notebook_design='custom_cover',notebook_technique='digital',notebook_pricing_fingerprint=quote['fingerprint'])
    saved=client.post('/api/v1/account/commissions',json=body)
    assert saved.status_code==200,saved.text
    snapshot=db.scalar(text('SELECT brief FROM commission_requests WHERE id=:id'),dict(id=saved.json()['id']))
    assert snapshot['notebook']['quote']['total_amount']=='1098000.00'
    target['price_amount']=Decimal('700000')
    assert client.post('/api/v1/account/commissions',json=body).json()==saved.json()
    assert client.post('/api/v1/account/commissions',json={**body,'submission_id':str(uuid4())}).status_code==409
    assert client.post('/api/v1/account/commissions',json={**body,'submission_id':str(uuid4()),'price':'1'}).status_code==422
