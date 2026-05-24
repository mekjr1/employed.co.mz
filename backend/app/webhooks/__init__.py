from fastapi import APIRouter

from app.webhooks.mobile_money import router as mobile_money_router
from app.webhooks.stripe_webhook import router as stripe_webhook_router

router = APIRouter()
router.include_router(stripe_webhook_router)
router.include_router(mobile_money_router)

__all__ = ["router", "mobile_money_router", "stripe_webhook_router"]
