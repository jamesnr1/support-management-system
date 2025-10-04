#!/bin/bash

# Apply Performance & UX Improvements Script
# This script helps integrate all the improvements

set -e

echo "🚀 Starting implementation of improvements..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Backup existing files
echo "${YELLOW}📦 Step 1: Creating backups...${NC}"
cp backend/server.py backend/server.py.backup
cp frontend/src/App.js frontend/src/App.js.backup
cp frontend/src/components/RosteringSystem.js frontend/src/components/RosteringSystem.js.backup
echo "${GREEN}✓ Backups created${NC}"
echo ""

# Step 2: Update App.js
echo "${YELLOW}📝 Step 2: Updating App.js...${NC}"
if [ -f "frontend/src/App_updated.js" ]; then
  cp frontend/src/App_updated.js frontend/src/App.js
  echo "${GREEN}✓ App.js updated${NC}"
else
  echo "${RED}✗ App_updated.js not found${NC}"
fi
echo ""

# Step 3: Check for .env
echo "${YELLOW}🔧 Step 3: Checking environment configuration...${NC}"
if ! grep -q "CORS_ORIGINS" backend/.env 2>/dev/null; then
  echo "Adding CORS_ORIGINS to .env..."
  echo "" >> backend/.env
  echo "# CORS Configuration" >> backend/.env
  echo "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000" >> backend/.env
  echo "${GREEN}✓ CORS configuration added${NC}"
else
  echo "${GREEN}✓ CORS already configured${NC}"
fi
echo ""

# Step 4: Instructions for manual steps
echo "${YELLOW}📋 Manual Steps Required:${NC}"
echo ""
echo "Please complete these steps manually:"
echo ""
echo "1. ${YELLOW}Update backend/server.py:${NC}"
echo "   - Open backend/server_updated.py"
echo "   - Copy SECTION 1 code and paste after line 58 (after CORS middleware)"
echo "   - Copy SECTION 2 code and paste after line 102 (after root endpoint)"
echo ""
echo "2. ${YELLOW}Update frontend/src/components/RosteringSystem.js:${NC}"
echo "   - Open frontend/src/components/RosteringSystem_additions.js"
echo "   - Follow the sections to add imports, state, and functionality"
echo ""
echo "3. ${YELLOW}Remove console.log statements:${NC}"
echo "   - Search for 'console.' in components and remove or replace"
echo ""
echo "${GREEN}✓ Automated steps complete!${NC}"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - INTEGRATION_STEPS.md"
echo "   - IMPLEMENTATION_GUIDE.md"
echo ""
echo "🧪 After integration, test with:"
echo "   curl http://localhost:8001/api/health"
echo ""
echo "💡 To restore backups if needed:"
echo "   cp backend/server.py.backup backend/server.py"
echo "   cp frontend/src/App.js.backup frontend/src/App.js"
echo "   cp frontend/src/components/RosteringSystem.js.backup frontend/src/components/RosteringSystem.js"
echo ""

