#!/usr/bin/env python3
"""
Remove auto-refresh from ALL admin tabs — switch to manual refresh only.
The 12-second auto-refresh was overwhelming Netlify serverless functions,
causing slow responses and making the admin panel unusable.

This script removes the setInterval lines and their cleanup, reverting to
load-once-on-mount behavior. The manual Refresh button still works.
"""
import re
from pathlib import Path

filepath = Path('/home/z/my-project/src/components/views/admin-view.tsx')
content = filepath.read_text()

# Pattern to match:
#     load()
#     const t = setInterval(load, 12000) // ...
#     return () => clearInterval(t)
#   }, [load])
#
# Replace with:
#     load() // Load once on mount — manual refresh only (tap Refresh button)
#   }, [load])

# Pattern for `load()` variant
pattern_load = re.compile(
    r'(useEffect\(\(\) => \{\s*\n\s*)load\(\)\s*\n\s*const t = setInterval\(load, 12000\)[^\n]*\n\s*return \(\) => clearInterval\(t\)\s*\n(\s*\}, \[load\]\))',
    re.MULTILINE
)

# Pattern for `loadUsers()` variant
pattern_loadUsers = re.compile(
    r'(useEffect\(\(\) => \{\s*\n\s*)loadUsers\(\)\s*\n\s*const t = setInterval\(loadUsers, 12000\)[^\n]*\n\s*return \(\) => clearInterval\(t\)\s*\n(\s*\}, \[loadUsers\]\))',
    re.MULTILINE
)

# Pattern for `loadCounts()` variant
pattern_loadCounts = re.compile(
    r'(loadCounts\(\))\s*\n\s*const t = setInterval\(loadCounts, 12000\)[^\n]*\n\s*return \(\) => clearInterval\(t\)\s*\n(\s*\}, \[\]\))',
    re.MULTILINE
)

# Pattern for `loadConversations()` variant (no comment)
pattern_loadConversations = re.compile(
    r'(useEffect\(\(\) => \{\s*\n\s*)loadConversations\(\)\s*\n\s*const t = setInterval\(loadConversations, 12000\)\s*\n\s*return \(\) => clearInterval\(t\)\s*\n(\s*\}, \[loadConversations\]\))',
    re.MULTILINE
)

# Pattern for `loadMessages()` variant
pattern_loadMessages = re.compile(
    r'(useEffect\(\(\) => \{\s*\n\s*if \(selectedUserId\) \{\s*\n\s*)loadMessages\(\)\s*\n\s*const t = setInterval\(loadMessages, 12000\)\s*\n\s*return \(\) => clearInterval\(t\)\s*\n(\s*\}\s*else\s*\{\s*\n\s*setMessages\(\[\]\)\s*\n\s*\}\s*\n\s*\}, \[selectedUserId, loadMessages\]\))',
    re.MULTILINE
)

count = 0
new_content = content

# Apply load pattern
new_content, n = pattern_load.subn(
    lambda m: m.group(1) + 'load() // Load once on mount — manual refresh only (tap Refresh button)\n' + m.group(2),
    new_content
)
count += n
print(f"load pattern: {n} replacements")

# Apply loadUsers pattern
new_content, n = pattern_loadUsers.subn(
    lambda m: m.group(1) + 'loadUsers() // Load once on mount — manual refresh only\n' + m.group(2),
    new_content
)
count += n
print(f"loadUsers pattern: {n} replacements")

# Apply loadCounts pattern
new_content, n = pattern_loadCounts.subn(
    lambda m: m.group(1) + ' // Load once on mount — manual refresh only\n' + m.group(2),
    new_content
)
count += n
print(f"loadCounts pattern: {n} replacements")

# Apply loadConversations pattern
new_content, n = pattern_loadConversations.subn(
    lambda m: m.group(1) + 'loadConversations() // Load once on mount — manual refresh only\n' + m.group(2),
    new_content
)
count += n
print(f"loadConversations pattern: {n} replacements")

# Apply loadMessages pattern
new_content, n = pattern_loadMessages.subn(
    lambda m: m.group(1) + 'loadMessages()\n    } else {\n      setMessages([])\n    }\n' + m.group(2),
    new_content
)
count += n
print(f"loadMessages pattern: {n} replacements")

filepath.write_text(new_content)
print(f"\nTotal: removed {count} auto-refresh intervals from admin panel")
