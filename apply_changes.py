#!/usr/bin/env python3
import re

# Read the file
with open('frontend/src/components/WorkerManagement.js', 'r') as f:
    content = f.read()

# Step 1: Add import after line 5
lines = content.split('\n')
if 'import WorkerCard from' not in content:
    # Find the lucide-react import line and add after it
    for i, line in enumerate(lines):
        if "from 'lucide-react'" in line:
            lines.insert(i + 1, "import WorkerCard from './WorkerCard';")
            break

content = '\n'.join(lines)

# Step 2: Replace the worker cards section
# Find the section starting with <div className="workers-grid">
pattern = r'(<div className="workers-grid">)\s*\{filteredWorkers\.map\(worker => \(\s*<div key=\{worker\.id\}[^>]*>.*?</div>\s*\)\)\}\s*(</div>)'

replacement = r'''\1
                {filteredWorkers.map(worker => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    onEdit={handleEditWorker}
                    onDelete={handleDeleteWorker}
                    onManageAvailability={handleManageAvailability}
                  />
                ))}
              \2'''

# Use DOTALL flag to match across newlines
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('frontend/src/components/WorkerManagement.js', 'w') as f:
    f.write(content)

print("✅ Changes applied successfully!")
print("✅ Added: import WorkerCard from './WorkerCard';")
print("✅ Replaced worker cards section with WorkerCard component")
print("\nThe frontend should auto-reload. Check the Admin tab to see the new worker cards.")

