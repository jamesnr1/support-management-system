# 🤖 AI Chat Assistant Setup

## What's Been Added

✅ **AI Chat Component** - Floating chat button in bottom-right corner
✅ **Backend Chat Endpoint** - `/api/chat` with OpenAI integration
✅ **Telegram Section Styling** - Now matches worker card theme
✅ **All Worker Cards Same Height** - Fixed uneven cards

---

## 🚀 Quick Start

### 1. Install OpenAI Package
```bash
cd backend
source venv/bin/activate
pip install openai==1.12.0
```

### 2. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

### 3. Add to Environment

**Local development:**
```bash
cd backend
echo "OPENAI_API_KEY=sk-your-actual-key-here" >> .env
```

**Production (Cloud Run):**
```bash
gcloud run services update support-backend \
  --update-env-vars OPENAI_API_KEY=sk-your-actual-key-here
```

### 4. Restart Backend
```bash
cd backend
pkill -f "python.*server.py"
source venv/bin/activate
python server.py &
```

### 5. Test It!
1. Refresh your browser
2. Look for the gold chat button (💬) in the bottom-right corner
3. Click it and ask: "Who can work on Monday?"

---

## 💬 Example Questions

Try asking the AI:
- **"Who is available on Monday between 2pm-6pm?"**
- **"Which shifts need a second worker?"**
- **"Can Sarah cover James's shift on Wednesday?"**
- **"Who has the most hours this week?"**
- **"Suggest workers for Tuesday 9am-3pm shift with James"**
- **"Who has a car and is available this weekend?"**
- **"Which workers have manual handling skills?"**

---

## 💰 Cost

- Model: **GPT-4o-mini** (cost-effective)
- Price: **~$0.01-0.05 per question**
- Estimated monthly: **$1-5** (for typical usage)

---

## 🎨 What Changed

### Frontend
- ✅ **New `AIChat.js` component** - Floating chat window
- ✅ **Telegram section** - Styled to match worker cards (gradient, gold border, shadow)
- ✅ **Worker cards** - All same height (260px) regardless of content

### Backend
- ✅ **New `/api/chat` endpoint** - Handles AI questions
- ✅ **OpenAI integration** - Uses gpt-4o-mini model
- ✅ **Context building** - Sends worker/participant data to AI

---

## 🔧 Customization

### Change AI Model (backend/server.py line 801)
```python
model="gpt-4o-mini",  # Change to "gpt-4o" for better quality (higher cost)
```

### Adjust Response Length (line 807)
```python
max_tokens=500  # Increase for longer responses
```

### Customize Chat Position (frontend/src/components/AIChat.js)
```javascript
position: 'fixed',
bottom: '2rem',  // Change position
right: '2rem',   // Change position
```

---

## 🐛 Troubleshooting

### "AI chat is not configured"
- Check if `OPENAI_API_KEY` is in your `.env` file
- Restart the backend server

### Chat button not showing
- Check browser console for errors
- Verify frontend is running
- Clear cache and refresh

### Slow responses
- Normal! AI takes 2-5 seconds to respond
- Using the fastest model (gpt-4o-mini)

---

## 📊 Features

- ✅ **Floating chat button** - Always accessible
- ✅ **Minimize/maximize** - Don't close, just minimize
- ✅ **Real worker data** - AI knows your actual workers
- ✅ **Roster context** - Understands shifts and availability
- ✅ **Mobile friendly** - Responsive design
- ✅ **Dark theme** - Matches your app

---

## 🔒 Security

- API key stored in environment variables
- Never exposed to frontend
- All AI calls go through your backend
- No data sent to OpenAI's training

---

## 📝 Notes

- AI responses are suggestions, not guarantees
- Always verify availability before assigning shifts
- The AI doesn't modify data, only suggests
- Conversation history resets when chat is closed

---

Ready to chat! 🚀
