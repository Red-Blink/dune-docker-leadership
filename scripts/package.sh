#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$repo_root"
node scripts/validate.js

python3 - <<'PY'
import hashlib
from pathlib import Path
import zipfile

root = Path.cwd()
dist = root / 'dist'
dist.mkdir(exist_ok=True)
archive = dist / 'leadership-board.zip'
paths = [root / 'addon.json', root / 'README.md', *sorted((root / 'web').rglob('*'))]
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
    for path in paths:
        if path.is_symlink():
            raise ValueError('Runtime package must not contain symlinks')
        if not path.is_file():
            continue
        info = zipfile.ZipInfo(path.relative_to(root).as_posix(), (1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        content = path.read_bytes()
        if path == root / 'web/index.html':
            # Sandboxed addon documents have an opaque origin. Their asset
            # requests do not carry the Console's SameSite session cookie.
            # Keep the installed entry self-contained without relaxing CSP.
            html = content.decode('utf-8')
            css = (root / 'web/styles.css').read_text()
            html = html.replace('<link rel="stylesheet" href="./styles.css">', '<style>' + css + '</style>')
            for script in ['dune-addon-bridge.js', 'addon.js']:
                source = (root / 'web' / script).read_text().replace('</script', '<\\/script')
                html = html.replace('<script src="./' + script + '"></script>', '<script>' + source + '</script>')
            content = html.encode('utf-8')
        package.writestr(info, content, compresslevel=9)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(dist / 'leadership-board.zip.sha256').write_text(f'{digest}  leadership-board.zip\n')
print(f'Created {archive}')
print(f'{digest}  leadership-board.zip')
PY
