#!/usr/bin/env python3
"""
Add 12-second auto-refresh to all admin tabs.
Changes the pattern:
  useEffect(() => { load() }, [load])
to:
  useEffect(() => { load(); const t = setInterval(load, 12000); return () => clearInterval(t) }, [load])
"""
import re
from pathlib import Path

filepath = Path('/home/z/my-project/src/components/views/admin-view.tsx')
content = filepath.read_text()

# Pattern 1: useEffect(() => { load() // ... }, [load])
pattern1 = re.compile(
    r'useEffect\(\(\) => \{\s*\n\s*load\(\) // Load once on mount — no auto-refresh\s*\n\s*\}, \[load\]\)'
)
# Pattern 2: useEffect(() => { load() // ... }, [load])
pattern2 = re.compile(
    r'useEffect\(\(\) => \{\s*\n\s*load\(\) // Load once on mount — no auto-refresh \(admin taps Refresh button manually\)\s*\n\s*\}, \[load\]\)'
)
# Pattern 3: loadUsers variant
pattern3 = re.compile(
    r'useEffect\(\(\) => \{\s*\n\s*loadUsers\(\) // Load once on mount — no auto-refresh\s*\n\s*\}, \[loadUsers\]\)'
)

replacement_load = '''useEffect(() => {
    load()
    const t = setInterval(load, 12000) // Auto-refresh every 12 seconds
    return () => clearInterval(t)
  }, [load])'''

replacement_loadUsers = '''useEffect(() => {
    loadUsers()
    const t = setInterval(loadUsers, 12000) // Auto-refresh every 12 seconds
    return () => clearInterval(t)
  }, [loadUsers])'''

count = 0
new_content = content

# Apply pattern 2 first (longer comment)
new_content, n = pattern2.subn(replacement_load, new_content)
count += n

# Apply pattern 1
new_content, n = pattern1.subn(replacement_load, new_content)
count += n

# Apply pattern 3
new_content, n = pattern3.subn(replacement_loadUsers, new_content)
count += n

# Also fix the loadCounts in AdminView
new_content = new_content.replace(
    'loadCounts() // Load once on mount — no auto-refresh\n  }, [])',
    'loadCounts()\n    const t = setInterval(loadCounts, 12000) // Auto-refresh every 12 seconds\n    return () => clearInterval(t)\n  }, [])'
)

# Fix support tab — loadConversations
new_content = new_content.replace(
    '''// Load once on mount — no auto-refresh (admin uses Refresh button)
  useEffect(() => {
    loadConversations()
  }, [loadConversations])''',
    '''useEffect(() => {
    loadConversations()
    const t = setInterval(loadConversations, 12000) // Auto-refresh every 12 seconds
    return () => clearInterval(t)
  }, [loadConversations])'''
)

filepath.write_text(new_content)
print(f"Updated {count} useEffect blocks with auto-refresh")
