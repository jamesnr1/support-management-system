#!/bin/bash

# Apply Worker Card Update Script
# This script helps integrate the new WorkerCard component

set -e

echo "🚀 Applying Worker Card Updates..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if WorkerCard.jsx exists
echo "${YELLOW}📦 Step 1: Checking files...${NC}"
if [ -f "frontend/src/components/WorkerCard.jsx" ]; then
  echo "${GREEN}✓ WorkerCard.jsx exists${NC}"
else
  echo "${RED}✗ WorkerCard.jsx not found!${NC}"
  exit 1
fi

# Step 2: Backup existing file
echo ""
echo "${YELLOW}💾 Step 2: Creating backup...${NC}"
if [ -f "frontend/src/components/WorkerManagement.js" ]; then
  cp frontend/src/components/WorkerManagement.js frontend/src/components/WorkerManagement.js.backup_workercard
  echo "${GREEN}✓ Backup created: WorkerManagement.js.backup_workercard${NC}"
else
  echo "${RED}✗ WorkerManagement.js not found!${NC}"
  exit 1
fi

# Step 3: Manual integration required
echo ""
echo "${YELLOW}📋 Step 3: Manual Integration Required${NC}"
echo ""
echo "Please open ${YELLOW}frontend/src/components/WorkerManagement.js${NC} and make these changes:"
echo ""
echo "1. ${GREEN}Add Import (after line 5):${NC}"
echo "   import WorkerCard from './WorkerCard';"
echo ""
echo "2. ${GREEN}Replace Worker Cards (around line 547-612):${NC}"
echo "   Find the section with:"
echo "     <div className=\"workers-grid\">"
echo "       {filteredWorkers.map(worker => ("
echo "         <div key={worker.id} className=\"worker-card\""
echo ""
echo "   Replace with:"
echo "     <div className=\"workers-grid\">"
echo "       {filteredWorkers.map(worker => ("
echo "         <WorkerCard"
echo "           key={worker.id}"
echo "           worker={worker}"
echo "           onEdit={handleEditWorker}"
echo "           onDelete={handleDeleteWorker}"
echo "           onManageAvailability={handleManageAvailability}"
echo "         />"
echo "       ))}"
echo "     </div>"
echo ""
echo "${GREEN}✓ Files ready for integration!${NC}"
echo ""
echo "📖 For detailed instructions, see: WORKER_CARD_UPDATE.md"
echo ""
echo "🧪 After making changes:"
echo "   cd frontend && npm start"
echo ""
echo "💡 To restore backup if needed:"
echo "   cp frontend/src/components/WorkerManagement.js.backup_workercard frontend/src/components/WorkerManagement.js"
echo ""

