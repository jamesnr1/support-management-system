"""Telegram integration endpoints"""
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, List
from database import db
from telegram_service import telegram_service
from core.security import get_rate_limiter, require_admin
from core.logging_config import get_logger

router = APIRouter(prefix="/api/telegram", tags=["telegram"])
limiter = get_rate_limiter()
logger = get_logger("telegram")

@router.get("/status")
@limiter.limit("30/minute")
async def get_telegram_status():
    """Get Telegram bot status"""
    try:
        status = telegram_service.get_status()
        return status
    except Exception as e:
        logger.error(f"Error checking Telegram status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check Telegram status")

@router.post("/send-message")
@limiter.limit("10/minute")
async def send_telegram_message(data: Dict[str, Any]):
    """Send a message to a specific worker via Telegram"""
    try:
        worker_id = data.get('worker_id')
        message = data.get('message')
        
        if not worker_id or not message:
            raise HTTPException(status_code=400, detail="Missing worker_id or message")
        
        # Get worker details
        worker = db.get_support_worker(worker_id)
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        
        if not worker.get('telegram'):
            raise HTTPException(status_code=400, detail="Worker has no Telegram ID")
        
        # Send message
        success = telegram_service.send_message(worker['telegram'], message)
        
        if success:
            return {"success": True, "message": "Message sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send message")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

@router.post("/broadcast")
@limiter.limit("5/minute")
async def broadcast_telegram_message(data: Dict[str, Any]):
    """Broadcast a message to all active workers"""
    try:
        message = data.get('message')
        if not message:
            raise HTTPException(status_code=400, detail="Missing message")
        
        # Get all active workers with Telegram IDs
        workers = db.get_support_workers()
        active_workers = [w for w in workers if w.get('status') == 'Active' and w.get('telegram')]
        
        if not active_workers:
            raise HTTPException(status_code=400, detail="No active workers with Telegram IDs found")
        
        # Send broadcast
        results = telegram_service.broadcast_message(message, [w['telegram'] for w in active_workers])
        
        return {
            "success": True,
            "message": f"Broadcast sent to {len(results)} workers",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting Telegram message: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast message")

@router.post("/notify-coordinators")
@limiter.limit("5/minute")
async def notify_coordinators(data: Dict[str, Any]):
    """Send notification to coordinators"""
    try:
        message = data.get('message')
        if not message:
            raise HTTPException(status_code=400, detail="Missing message")
        
        # Get coordinators (workers with coordinator role or specific criteria)
        workers = db.get_support_workers()
        coordinators = [w for w in workers if w.get('status') == 'Active' and w.get('telegram')]
        
        if not coordinators:
            raise HTTPException(status_code=400, detail="No coordinators with Telegram IDs found")
        
        # Send notifications
        results = telegram_service.broadcast_message(message, [w['telegram'] for w in coordinators])
        
        return {
            "success": True,
            "message": f"Notifications sent to {len(results)} coordinators",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error notifying coordinators: {e}")
        raise HTTPException(status_code=500, detail="Failed to notify coordinators")

@router.post("/shift-notification")
@limiter.limit("10/minute")
async def send_shift_notification(data: Dict[str, Any]):
    """Send shift-related notification"""
    try:
        worker_ids = data.get('worker_ids', [])
        message = data.get('message')
        
        if not worker_ids or not message:
            raise HTTPException(status_code=400, detail="Missing worker_ids or message")
        
        # Get workers with Telegram IDs
        workers = db.get_support_workers()
        target_workers = []
        
        for worker_id in worker_ids:
            worker = next((w for w in workers if str(w['id']) == str(worker_id)), None)
            if worker and worker.get('telegram'):
                target_workers.append(worker['telegram'])
        
        if not target_workers:
            raise HTTPException(status_code=400, detail="No workers with Telegram IDs found")
        
        # Send notifications
        results = telegram_service.broadcast_message(message, target_workers)
        
        return {
            "success": True,
            "message": f"Shift notifications sent to {len(results)} workers",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending shift notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to send shift notifications")
