"""AI Chat endpoints"""
from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any
from database import db
from core.security import get_rate_limiter
from core.logging_config import get_logger
from collections import defaultdict
from datetime import datetime
import os

router = APIRouter(prefix="/api", tags=["ai"])
limiter = get_rate_limiter()
logger = get_logger("ai_chat")

# Initialize OpenAI client
openai_client = None
try:
    from openai import OpenAI
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        openai_client = OpenAI(api_key=openai_api_key)
except ImportError:
    logger.warning("OpenAI library not available")

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_with_ai(data: Dict[str, Any]):
    """Chat with AI assistant for roster management"""
    try:
        if not openai_client:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        user_message = data.get('message', '')
        if not user_message:
            raise HTTPException(status_code=400, detail="Missing message")
        
        # Gather context: workers, availability, roster data
        workers = db.get_support_workers()
        participants = db.get_participants()
        roster_data = {}  # Will be populated from ROSTER_DATA
        
        # Build context string with detailed worker information
        worker_info = []
        
        # Fix N+1 query problem: Batch load availability rules for all workers
        worker_ids = [w.get('id') for w in workers[:45] if w.get('id')]
        availability_rules_batch = db.get_availability_rules_batch(worker_ids)
        
        for w in workers[:45]:  # Include more workers for comprehensive queries
            worker_id = w.get('id')
            
            # Get availability for this worker
            availability_text = "No availability set"
            unavailability_text = ""
            if worker_id:
                try:
                    # Get regular availability rules from batch-loaded data
                    avail_rules = availability_rules_batch.get(worker_id, [])
                    if avail_rules:
                        # Group by weekday
                        by_day = defaultdict(list)
                        for rule in avail_rules:
                            weekday = rule.get('weekday', 0)
                            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                            day_name = day_names[weekday] if 0 <= weekday <= 6 else 'Unknown'
                            
                            if rule.get('is_full_day'):
                                by_day[day_name].append('all day')
                            else:
                                from_time = rule.get('from_time', '')
                                to_time = rule.get('to_time', '')
                                by_day[day_name].append(f"{from_time}-{to_time}")
                        
                        # Format availability text
                        avail_parts = [f"{day}: {', '.join(times)}" for day, times in sorted(by_day.items())]
                        availability_text = "; ".join(avail_parts) if avail_parts else "Available but no times set"
                    
                    # Check for unavailability periods
                    unavail_periods = db.get_unavailability_periods(worker_id)
                    if unavail_periods:
                        today = datetime.now().date()
                        active_periods = []
                        for period in unavail_periods:
                            from_date_str = period.get('from_date', '')
                            to_date_str = period.get('to_date', '')
                            reason = period.get('reason', 'Leave')
                            
                            try:
                                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
                                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()
                                
                                if from_date <= today <= to_date:
                                    active_periods.append(f"{from_date_str} to {to_date_str} ({reason})")
                            except ValueError:
                                continue
                        
                        if active_periods:
                            unavailability_text = f"Currently unavailable: {', '.join(active_periods)}"
                
                except Exception as e:
                    logger.error(f"Error getting availability for worker {worker_id}: {e}")
            
            worker_info.append(
                f"- {w.get('full_name', 'Unknown')} (ID: {worker_id}, "
                f"Status: {w.get('status', 'Unknown')}, "
                f"Availability: {availability_text}"
                f"{', ' + unavailability_text if unavailability_text else ''})"
            )
        
        # Build participant information
        participant_info = [
            f"- {p.get('name', 'Unknown')} (Code: {p.get('code', 'N/A')}, "
            f"Support ratio: {p.get('support_ratio', '1:1')})"
            for p in participants[:10]
        ]
        
        # Get current roster/shift assignments  
        try:
            # Import ROSTER_DATA from the main module
            from server import ROSTER_DATA
            roster_data_dict = ROSTER_DATA.get('weekA', {})
            
            if roster_data_dict:
                logger.info(f"AI Chat - Found {len(roster_data_dict)} participants in roster")
                
                # Roster structure: { participant_code: { date: [shifts] } }
                for participant_code, dates_dict in roster_data_dict.items():
                    # Skip entries that aren't participant codes (e.g., stray date keys)
                    if not isinstance(dates_dict, dict):
                        continue
                    if participant_code in ['admin', 'hours']:
                        continue
                        
                    participant_name = participant_code  # Could be improved with participant mapping
                    for date_str, shifts in dates_dict.items():
                        if isinstance(shifts, list):
                            for shift in shifts:
                                worker_ids = shift.get('workers', [])
                                worker_names = [f'ID{wid}' for wid in worker_ids]  # Could be improved with worker mapping
                                if worker_names:
                                    roster_data[f"{participant_name} on {date_str}"] = f"Workers: {', '.join(worker_names)}"
        except Exception as e:
            logger.error(f"Error getting roster data for AI context: {e}")
            roster_data = {"error": "Could not load current roster data"}
        
        # Build comprehensive context
        context = f"""
Support Management System Context:

WORKERS ({len(workers)} total):
{chr(10).join(worker_info)}

PARTICIPANTS ({len(participants)} total):
{chr(10).join(participant_info)}

CURRENT ROSTER ASSIGNMENTS:
{chr(10).join([f"- {k}: {v}" for k, v in roster_data.items()])}

SYSTEM CAPABILITIES:
- View and manage worker availability
- Create and edit shift schedules
- Track participant requirements
- Send notifications via Telegram
- Integrate with Google Calendar
- Validate roster compliance

Please provide helpful, accurate responses about roster management, worker scheduling, and system operations.
"""
        
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": user_message}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content
        
        logger.info("ai_chat_request", 
                   user_message_length=len(user_message),
                   response_length=len(ai_response))
        
        return {
            "response": ai_response,
            "context_used": {
                "workers_count": len(workers),
                "participants_count": len(participants),
                "roster_entries": len(roster_data)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI chat: {e}")
        raise HTTPException(status_code=500, detail="AI service error")
