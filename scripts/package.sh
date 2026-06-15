#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist_dir="$repo_root/dist"
archive="$dist_dir/leadership-board.zip"

mkdir -p "$dist_dir"
rm -f "$archive"

cd "$repo_root"
if command -v zip >/dev/null 2>&1; then
  zip -qr "$archive" addon.json web README.md
else
  python3 - "$archive" <<'PY'
import pathlib
import sys
import zipfile

archive = pathlib.Path(sys.argv[1])
root = pathlib.Path.cwd()
paths = [root / "addon.json", root / "README.md", root / "web"]
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for path in paths:
        if path.is_dir():
            for child in sorted(path.rglob("*")):
                if child.is_file():
                    zf.write(child, child.relative_to(root).as_posix())
        else:
            zf.write(path, path.relative_to(root).as_posix())
PY
fi

echo "Created $archive"
sha256sum "$archive"
