#!/usr/bin/env python3
"""
Add top-level try/catch to all admin API route handlers.

This fixes the systemic "Unexpected end of JSON input" bug where any Prisma
error causes the route to throw an unhandled exception → Next.js returns
an empty body → client's `await res.json()` fails.

Strategy:
- For each route.ts file in src/app/api/admin/**/route.ts
- Parse the file, find all `export async function GET/POST/etc.` handlers
- If the handler body is NOT already wrapped in try/catch, wrap it
- The catch returns NextResponse.json({ error: e.message }, { status: 500 })
"""
import re
import os
import sys
from pathlib import Path

# Admin API route files
admin_dir = Path('/home/z/my-project/src/app/api/admin')
route_files = sorted(admin_dir.glob('**/route.ts'))

print(f"Found {len(route_files)} admin route files")

# Pattern to match exported async function signatures
# e.g. "export async function GET(req: NextRequest) {"
HANDLER_PATTERN = re.compile(
    r'^(export async function (?:GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{)\s*$',
    re.MULTILINE
)

# Skip files that are already fixed (have "// AUTO-TRY-CATCH" marker)
MARKER = '// AUTO-TRY-CATCH'

def find_matching_brace(text, start_pos):
    """Find the matching closing brace for the brace at start_pos."""
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

def wrap_handler_in_try_catch(content, handler_start_match):
    """Wrap a single handler body in try/catch."""
    # handler_start_match is a regex match for "export async function GET(...) {"
    brace_pos = handler_start_match.end() - 1  # position of the opening brace
    closing_brace_pos = find_matching_brace(content, brace_pos)
    if closing_brace_pos == -1:
        return content, False

    # Extract the body (between { and })
    body = content[brace_pos + 1:closing_brace_pos]

    # Skip if already wrapped (heuristic: has 'catch (e' before the body starts)
    if 'catch (e' in body[:200] or MARKER in body[:200]:
        return content, False

    # Build the new body with try/catch
    # Indent the existing body by 2 spaces
    body_lines = body.split('\n')
    indented_body = '\n'.join('  ' + line if line.strip() else line for line in body_lines)

    new_body = f'''
{MARKER}
  try {{
{indented_body}
  }} catch (e: any) {{
    console.error('[admin route error]', e)
    return NextResponse.json({{ error: e.message || 'Internal server error' }}, {{ status: 500 }})
  }}
'''

    # Reconstruct: replace the body
    new_content = (
        content[:brace_pos + 1] +
        new_body +
        content[closing_brace_pos:]
    )
    return new_content, True

total_wrapped = 0
for route_file in route_files:
    rel_path = route_file.relative_to(admin_dir)
    print(f"\nProcessing: {rel_path}")

    content = route_file.read_text()
    original = content

    # Find all handlers (GET, POST, etc.)
    matches = list(HANDLER_PATTERN.finditer(content))
    if not matches:
        print(f"  No handlers found, skipping")
        continue

    # Process matches in reverse order so positions don't shift
    wrapped_in_file = 0
    for match in reversed(matches):
        content, was_wrapped = wrap_handler_in_try_catch(content, match)
        if was_wrapped:
            wrapped_in_file += 1

    if wrapped_in_file > 0:
        route_file.write_text(content)
        print(f"  Wrapped {wrapped_in_file} handler(s) in try/catch")
        total_wrapped += wrapped_in_file
    else:
        print(f"  No handlers needed wrapping (already wrapped or skipped)")

print(f"\nDone! Wrapped {total_wrapped} handlers total.")
