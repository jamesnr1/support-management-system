"""
Telegram Bot Service for Support Management System
Handles messaging to workers and coordinators
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any
from telegram import Bot
from telegram.error import TelegramError
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class TelegramService:
    def __init__(self):
        self.bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.coordinator_chat_ids = self._parse_coordinator_ids()
        self.bot = None
        
        if not self.bot_token:
            logger.warning("TELEGRAM_BOT_TOKEN not found in environment variables")
        else:
            self.bot = Bot(token=self.bot_token)
            logger.info(f"Telegram bot initialized with {len(self.coordinator_chat_ids)} coordinators")

    def _parse_coordinator_ids(self) -> List[str]:
        """Parse coordinator chat IDs from environment variable"""
        coordinator_ids = os.getenv('TELEGRAM_COORDINATOR_IDS', '')
        if not coordinator_ids:
            return []
        
        # Support comma-separated list of coordinator IDs
        ids = [id.strip() for id in coordinator_ids.split(',') if id.strip()]
        return ids

    async def send_message_to_worker(self, worker_telegram_id: str, message: str) -> bool:
        """Send a message to a specific worker"""
        if not self.bot:
            logger.error("Telegram bot not initialized")
            return False
            
        try:
            await self.bot.send_message(chat_id=worker_telegram_id, text=message)
            logger.info(f"Message sent to worker {worker_telegram_id}")
            return True
        except TelegramError as e:
            logger.error(f"Failed to send message to worker {worker_telegram_id}: {e}")
            return False

    async def send_message_to_workers(self, worker_telegram_ids: List[str], message: str) -> Dict[str, bool]:
        """Send a message to multiple workers"""
        if not self.bot:
            logger.error("Telegram bot not initialized")
            return {worker_id: False for worker_id in worker_telegram_ids}
        
        results = {}
        for worker_id in worker_telegram_ids:
            results[worker_id] = await self.send_message_to_worker(worker_id, message)
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.1)
        
        return results

    async def broadcast_to_all_workers(self, worker_telegram_ids: List[str], message: str) -> Dict[str, bool]:
        """Broadcast a message to all workers"""
        logger.info(f"Broadcasting message to {len(worker_telegram_ids)} workers")
        return await self.send_message_to_workers(worker_telegram_ids, message)

    async def send_message_to_coordinators(self, message: str) -> Dict[str, bool]:
        """Send a message to all coordinators"""
        if not self.coordinator_chat_ids:
            logger.warning("No coordinator chat IDs configured")
            return {}
        
        results = {}
        for coordinator_id in self.coordinator_chat_ids:
            results[coordinator_id] = await self.send_message_to_worker(coordinator_id, message)
        
        logger.info(f"Message sent to {len(self.coordinator_chat_ids)} coordinators")
        return results

    async def send_shift_notification(self, worker_telegram_id: str, shift_details: Dict[str, Any]) -> bool:
        """Send a shift notification to a worker"""
        message = self._format_shift_notification(shift_details)
        return await self.send_message_to_worker(worker_telegram_id, message)

    async def send_shift_reminder(self, worker_telegram_id: str, shift_details: Dict[str, Any], hours_before: int = 2) -> bool:
        """Send a shift reminder to a worker"""
        message = self._format_shift_reminder(shift_details, hours_before)
        return await self.send_message_to_worker(worker_telegram_id, message)

    def _format_shift_notification(self, shift_details: Dict[str, Any]) -> str:
        """Format a shift notification message"""
        participant = shift_details.get('participant', 'Unknown')
        date = shift_details.get('date', 'Unknown')
        start_time = shift_details.get('start_time', 'Unknown')
        end_time = shift_details.get('end_time', 'Unknown')
        location = shift_details.get('location', 'Unknown')
        
        message = f"""🔔 **New Shift Assignment**

👤 **Participant:** {participant}
📅 **Date:** {date}
⏰ **Time:** {start_time} - {end_time}
📍 **Location:** {location}

Please confirm your availability for this shift.
Reply with ✅ to confirm or ❌ to decline."""
        
        return message

    def _format_shift_reminder(self, shift_details: Dict[str, Any], hours_before: int) -> str:
        """Format a shift reminder message"""
        participant = shift_details.get('participant', 'Unknown')
        date = shift_details.get('date', 'Unknown')
        start_time = shift_details.get('start_time', 'Unknown')
        location = shift_details.get('location', 'Unknown')
        
        message = f"""⏰ **Shift Reminder - {hours_before} hours**

👤 **Participant:** {participant}
📅 **Date:** {date}
⏰ **Start Time:** {start_time}
📍 **Location:** {location}

Don't forget about your upcoming shift!"""
        
        return message

    async def send_availability_request(self, worker_telegram_id: str, worker_name: str) -> bool:
        """Send an availability request to a worker"""
        message = f"""📅 **Availability Update Request**

Hi {worker_name}! 

Please update your availability in the support management system.

You can:
• Set your weekly schedule
• Mark unavailable periods (holidays, sick leave, etc.)
• Update your maximum hours

This helps us create better rosters for everyone! 🙂"""
        
        return await self.send_message_to_worker(worker_telegram_id, message)

    def is_configured(self) -> bool:
        """Check if Telegram service is properly configured"""
        return bool(self.bot_token and self.bot)

    def get_coordinator_count(self) -> int:
        """Get the number of configured coordinators"""
        return len(self.coordinator_chat_ids)

# Global instance
telegram_service = TelegramService()
