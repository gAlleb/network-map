# Network map

**English** · [Русский](README.ru.md)

An interactive map of a home, office and cloud network: devices, zones, links
(LAN, Wi-Fi, WireGuard, NetBird, Yggdrasil, AmneziaWG) and live ping.

Nuxt 4 · Nuxt UI 4 · Vue Flow · SQLite (`node:sqlite` from Node 24, no native modules).

The interface is in Russian.

## Two views

- **Map.** Devices are drawn as pictures and can be moved around. A zone is dragged
  by its title and carries its devices with it; it is resized by the corners when
  selected. Dropping a device into another zone moves it there. To link two
  devices, drag from a handle on the edge of one to the other.
- **Scheme.** An automatic layout in columns by zone, with compact cards. Cable
  links inside a zone are faint and light up when a device is selected.

Clicking a device, a link or a zone title opens the side panel: every address
(with copy), services with links, connections, notes, editing.

The map's server does the pinging, not the browser. Each address of a device has
its own setting: not pinged, or pinged every 10 s … 15 min. By default LAN, NetBird
and public IPv4 addresses are pinged every 20 s, Yggdrasil every 2 min (with a
longer wait for the answer). Change it in the device form or right in the panel by
clicking the mark next to an address. The device dot: green — all pinged addresses
answer, yellow — some, red — none, grey — still checking. A “YGG” badge under a
device means its Yggdrasil address is pinged.

## Services

A service has three addresses: by IP, by a local name (a name with a real
certificate that only resolves inside the network) and from the internet. Services
live on device cards; the “Services” tab gathers them from all machines, by zone,
with search, and lets you add, edit and move them to another machine.

## Running

```bash
docker compose up -d --build
```

Opens at `http://<host>:3080`. The database is `./data/network.db`. On the first
start it is filled with a made-up demo network from `server/demo-network.json`, so
you can see how everything looks. Its addresses are not pinged — they are not real.
Edit the demo or replace it with your own map right away (see “Backup”).

Updating: `git pull && docker compose up -d --build`. The database lives in
`./data`, outside the image, and is not touched by an update.

The container uses host networking (`network_mode: host`): pings leave from the
host itself and reach everything it reaches — the LAN, other sites through
tunnels, NetBird and Yggdrasil. The port is set with the `PORT` variable.

## Backup

Menu “⋮” → “Скачать JSON” (download JSON) saves the whole map as one file;
“Загрузить JSON…” (load JSON) replaces the current map with one. The same over the
API:

```bash
curl -o network-map.json http://<host>:3080/api/export
curl -X POST -H 'Content-Type: application/json' --data @network-map.json http://<host>:3080/api/import
```

Restoring elsewhere: `git clone`, `docker compose up -d --build`, load the file.
An import replaces the whole map; device ids and links come back as they were.

## Read API

To let another program or an AI understand the network, give it one address:

- `GET /api/map.md` — the whole map as Markdown: how to read it, zones, devices
  with addresses, ping state and services, all links. This one is for AI.
- `GET /api/map` — the same as JSON: names instead of ids, a dictionary of codes
  (`legend`), notes on the fields (`about`), no coordinates or colours.

The content of both is in Russian. They are read-only; the map cannot be changed
through them.

## Development

```bash
npm install
npm run dev
```
