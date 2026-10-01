#!/usr/bin/env python3
"""Generate host-only demo secrets; never prints or replaces existing secrets."""
import os
from pathlib import Path
import secrets
import sys

base = Path('/backupfiles/raastdemo')
if not os.path.ismount('/backupfiles'):
    raise SystemExit('Data disk is not mounted')
target = base / '.env'
if target.exists():
    raise SystemExit('Existing environment preserved; update APP_IMAGE explicitly for upgrades')
if len(sys.argv) != 2 or not sys.argv[1].startswith('raastdemo:v0.1.0-'):
    raise SystemExit('Expected versioned app image')
values = {
    'APP_IMAGE': sys.argv[1],
    'DATA_DIR': str(base / 'data'),
    'DB_PASSWORD': secrets.token_hex(32),
    'SESSION_SECRET': secrets.token_hex(32),
    'APP_PORT': '3100',
    'APP_BASE_URL': 'http://raastdemo.paysyslabs.com',
    'APP_ORIGINS': 'http://raastdemo.paysyslabs.com,http://localhost:3100,http://127.0.0.1:3100',
    'COOKIE_SECURE': 'false',
}
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as stream:
    stream.write(''.join(f'{key}={value}\n' for key, value in values.items()))
print('Restricted demo environment created; secrets not displayed.')
