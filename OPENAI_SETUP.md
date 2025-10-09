# 🤖 OpenAI AI Chatbox Setup Guide

## What You Need

### 1. OpenAI API Key
- **Where to get it**: https://platform.openai.com/api-keys
- **How to get it**:
  1. Sign in to OpenAI
  2. Click "Create new secret key"
  3. Name it "Support Management System"
  4. Copy the key (starts with `sk-...`)
  5. ⚠️ Save it immediately!

### 2. Your Supabase Credentials (already have these)
- SUPABASE_URL
- SUPABASE_KEY

## Setup Steps

### Step 1: Edit the .env file

Open this file: `/Users/James/support-management-system/backend/.env`

Replace the placeholder values with your actual credentials:

```env
# OpenAI API Key for AI Chat Assistant
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE

# Supabase Configuration (you already have these from your working setup)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_key

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_token
```

### Step 2: Restart the Backend Server

```bash
cd /Users/James/support-management-system/backend
pkill -f "python.*server.py"
source venv/bin/activate
python3 server.py > server.log 2>&1 &
```

### Step 3: Test the AI Chatbox

1. Open your app in the browser
2. Click the AI chat icon
3. Ask a question like: "Who is available for a Saturday morning shift?"
4. The AI should respond with worker suggestions!

## How It Works

The AI chatbox uses:
- **Model**: GPT-4o-mini (cost-effective)
- **Context**: Your workers, participants, and current roster
- **Purpose**: Help with scheduling decisions

## What the AI Can Do

✅ **Suggest workers** for specific shifts
✅ **Check availability** of workers
✅ **Identify conflicts** in scheduling
✅ **Recommend coverage** based on skills
✅ **Help with ratio requirements** (1:1, 2:1)

## Example Questions

```
"Who is available Saturday morning?"
"Who has fewer than 30 hours this week?"
"Which workers can drive?"
"Who should I assign to a 2:1 shift with Grace?"
"Why can't I assign Happy to this shift?"
```

## Cost

OpenAI charges per token:
- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **Typical chat**: ~500-1000 tokens = $0.001 per question
- **Budget**: Should be < $5/month for normal use

## Troubleshooting

### "AI chat is not configured"
- Check that `OPENAI_API_KEY` is set in `/backend/.env`
- Restart the backend server
- Check logs: `tail -f backend/server.log`

### "API key is invalid"
- Make sure you copied the full key from OpenAI
- Check for extra spaces or line breaks
- Generate a new key if needed

### Server won't start
- Make sure Supabase credentials are also in `.env`
- Check `backend/server.log` for errors

## For Deployment (Vercel)

When you deploy to Vercel, add these environment variables in Vercel dashboard:

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add:
   - `OPENAI_API_KEY` = your OpenAI key
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_KEY` = your Supabase key
   - `TELEGRAM_BOT_TOKEN` = your Telegram token
3. Redeploy

---

**Ready to enable AI chat!** Just add your OpenAI API key to the .env file and restart the server. 🚀
