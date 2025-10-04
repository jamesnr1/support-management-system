#!/usr/bin/env python3
"""
Script to update WorkerManagement.js to use the new WorkerCard component
"""

import re

# Read the file
with open('frontend/src/components/WorkerManagement.js', 'r') as f:
    content = f.read()

# Step 1: Add import for WorkerCard after line 5
import_section = """import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { X, Edit, Trash2, Plus, Calendar } from 'lucide-react';"""

new_import_section = """import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { X, Edit, Trash2, Plus, Calendar } from 'lucide-react';
import WorkerCard from './WorkerCard';"""

content = content.replace(import_section, new_import_section)

# Step 2: Replace the worker cards section (lines 547-612)
old_worker_cards = r'<div className="workers-grid">\s*\{filteredWorkers\.map\(worker => \(\s*<div key=\{worker\.id\} className="worker-card".*?</div>\s*\)\)\}\s*</div>'

new_worker_cards = '''<div className="workers-grid">
                {filteredWorkers.map(worker => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    onEdit={handleEditWorker}
                    onDelete={handleDeleteWorker}
                    onManageAvailability={handleManageAvailability}
                  />
                ))}
              </div>'''

# Use a more specific pattern to find the exact section
pattern = r'(<div className="workers-grid">)\s*\{filteredWorkers\.map\(worker => \(\s*<div key=\{worker\.id\} className="worker-card"[^>]*>.*?</div>\s*\)\)\}\s*(</div>)'

content = re.sub(pattern, new_worker_cards, content, flags=re.DOTALL)

# Write the updated content back
with open('frontend/src/components/WorkerManagement.js', 'w') as f:
    f.write(content)

print("✅ WorkerManagement.js updated successfully!")
print("✅ Import added: WorkerCard component")
print("✅ Worker cards section replaced with new component")
print("")
print("Next steps:")
print("1. Verify the changes in WorkerManagement.js")
print("2. Start the frontend: cd frontend && npm start")
print("3. Test the worker cards in the Admin tab")

