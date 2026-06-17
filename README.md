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

The archive is written to:

```text
dist/leadership-board.zip
```

Generate the checksum for the community addons index:

```bash
sha256sum dist/leadership-board.zip
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
  "rows": [
    {
      "characterName": "Player",
      "level": 50,
      "faction": "Atreides",
      "guild": "Guild Name",
      "onlineStatus": "Online",
      "map": "Survival_1",
      "lastSeen": "2026-06-15T12:00:00Z"
    }
  ]
}
```
