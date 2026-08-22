#!/usr/bin/env python3
"""
Add top-level try/catch to all USER-facing API route handlers.
Same fix as the admin routes — prevents empty responses on DB errors.
"""
import re
from pathlib import Path

# User API route files
user_dirs = [
    Path('/home/z/my-project/src/app/api/auth'),
    Path('/home/z/my-project/src/app/api/wallet'),
    Path('/home/z/my-project/src/app/api/p2p'),
    Path('/home/z/my-project/src/app/api/notifications'),
    Path('/home/z/my-project/src/app/api/support'),
    Path('/home/z/my-project/src/app/api/kyc'),
    Path('/home/z/my-project/src/app/api/markets'),
    Path('/home/z/my-project/src/app/api/trading'),
    Path('/home/z/my-project/src/app/api/orders'),
    Path('/home/z/my-project/src/app/api/push'),
]

route_files = []
for d in user_dirs:
    if d.exists():
        route_files.extend(sorted(d.glob('**/route.ts')))

print(f"Found {len(route_files)} user route files")

HANDLER_PATTERN = re.compile(
    r'^(export async function (?:GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{)\s*$',
    re.MULTILINE
)

MARKER = '// AUTO-TRY-CATCH'

def find_matching_brace(text, start_pos):
    depth = 0
    i = start_pos
    while i < len(text):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1

def wrap_handler(content, handler_start_match):
    brace_pos = handler_start_match.end() - 1
    closing_brace_pos = find_matching_brace(content, brace_pos)
    if closing_brace_pos == -1:
        return content, False

    body = content[brace_pos + 1:closing_brace_pos]

    if 'catch (e' in body[:200] or MARKER in body[:200]:
        return content, False

    body_lines = body.split('\n')
    indented_body = '\n'.join('  ' + line if line.strip() else line for line in body_lines)

    new_body = f'''
{MARKER}
  try {{
{indented_body}
  }} catch (e: any) {{
    console.error('[user route error]', e)
    return NextResponse.json({{ error: e.message || 'Internal server error' }}, {{ status: 500 }})
  }}
'''

    new_content = (
        content[:brace_pos + 1] +
        new_body +
        content[closing_brace_pos:]
    )
    return new_content, True

total_wrapped = 0
for route_file in route_files:
    rel_path = route_file.relative_to(Path('/home/z/my-project/src/app/api'))
    content = route_file.read_text()

    matches = list(HANDLER_PATTERN.finditer(content))
    if not matches:
        continue

    wrapped_in_file = 0
    for match in reversed(matches):
        content, was_wrapped = wrap_handler(content, match)
        if was_wrapped:
            wrapped_in_file += 1

    if wrapped_in_file > 0:
        # Make sure NextResponse is imported
        if 'NextResponse' not in content:
            content = content.replace(
                "import { NextRequest } from 'next/server'",
                "import { NextRequest, NextResponse } from 'next/server'"
            )
            content = content.replace(
                "import { NextRequest,",
                "import { NextRequest, NextResponse,"
            )
        route_file.write_text(content)
        print(f"  Wrapped {wrapped_in_file} handler(s) in {rel_path}")
        total_wrapped += wrapped_in_file

print(f"\nDone! Wrapped {total_wrapped} handlers total.")
