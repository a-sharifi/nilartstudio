"""Authenticated basket quote; this read never reserves or consumes a code."""
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request

from nilart.contexts.basket.router import output, owned
from nilart.contexts.discounts.engine import DiscountError, evaluate, rule_by_code
from nilart.contexts.payments.router import actor, fail
from nilart.shared.database import session_dependency

router=APIRouter(prefix='/api/v1/discounts',tags=['discount-quotes'])


class QuoteInput(BaseModel):
    code:str=Field(pattern=r'^[A-Z0-9][A-Z0-9_-]{0,79}$')
    basket_version:int=Field(strict=True,ge=0)


class QuoteOutput(BaseModel):
    discount_id:UUID
    version:int
    code:str
    basket_version:int
    amount:str
    eligible:str
    total:str
    allocations:dict[str,str]


@router.post('/quote',response_model=QuoteOutput)
def quote(body:QuoteInput,request:Request,response:Response,db:Session=Depends(session_dependency)):
    account=actor(request,db)
    basket=owned(request,db,account)
    if not basket or basket['version']!=body.basket_version:
        fail('stale_basket',409)
    current=output(request,db,basket,account)
    try:
        rule=rule_by_code(db,body.code)
        phone=db.scalar(text('SELECT phone FROM identity_accounts WHERE id=:id'),{'id':account.id})
        result=evaluate(db,rule,current,account.id,phone)
    except DiscountError as error:
        fail(str(error),409)
    response.headers['Cache-Control']='no-store'
    return {**result,"allocations":{key:str(value) for key,value in result["allocations"].items()}}
