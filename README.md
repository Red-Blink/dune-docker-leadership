# Dune Docker Leadership Demo

Demo Leadership Board addon for Dune Docker Console.

This addon demonstrates how a read-only Dune Docker Console addon can add a Leadership Board page showing player rankings, levels, factions, guilds, online status, maps, and last-seen activity.

## Addon Details

- Addon ID: `leadership-board-demo`
- Type: `ui`
- Required permission: `players:read`
- Entry point: `web/index.html`

## Package

Create a release archive:

```bash
./scripts/package.sh
```

Packaging requires Node.js and Python 3. The archive and checksum are written to:

```text
dist/leadership-board.zip
dist/leadership-board.zip.sha256
```

Verify downloaded release files from the directory containing them:

```bash
sha256sum -c leadership-board.zip.sha256
```

## Community Listing

This repository owns the addon package and `addon.json`. The community catalog owns listing metadata such as lifecycle status.

When this addon is listed in `dune-docker-addons/index.json`, it should be marked:

```json
"lifecycle": "active",
"lifecycleMessage": "",
"lifecycleUrl": ""
```

If this demo is ever abandoned or unsafe, update the community index instead of changing this package metadata. That lets Dune Docker Console warn users, block new installs when needed, and keep uninstall available for already-installed copies.

## Console API

The addon expects Dune Docker Console to provide an addon bridge action:

```text
leadership.players.list
```

The response should include:

```json
{
  "capabilities": { "players": true, "leadership": true },
  "rows": [
    {
      "name": "Player",
      "level": 50,
      "faction": "Atreides",
      "guild": "Guild Name",
      "status": "Online",
      "map": "Survival_1",
      "lastSeen": "2026-06-15T12:00:00Z"
    }
  ]
}
```

The addon uses the Console's permissioned iframe bridge. It does not need an
API key or direct REST access. Legacy player-name and status aliases remain
readable. When player data is unavailable, the addon shows an error instead of
reporting an empty server.

`leadership.players.list` remains supported by the current Console and preserves
compatibility with earlier installations. The newer `players.summary.list`
action returns the same player-summary shape.

## Development and Tests

```bash
node scripts/validate.js
node --test test/*.test.js
bash -n scripts/package.sh
```

Open the addon inside the Console to use real data. Standalone layout previews
need a mocked `window.DuneAddon.request`; they do not call a separate REST
endpoint. `browser-tests/leadership.mjs` checks the real sandbox bridge, ranking,
online counts, search and mobile layouts using synthetic data. Set
`PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` for your installed browser.
