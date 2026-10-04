import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import demo from '../demo-network.json'

// node:sqlite ships with Node 24, so the image needs no native module build.
let db: DatabaseSync | undefined

const SCHEMA = `
CREATE TABLE IF NOT EXISTS zones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  kind        TEXT    NOT NULL DEFAULT 'other',
  subnet      TEXT    NOT NULL DEFAULT '',
  color       TEXT    NOT NULL DEFAULT 'zinc',
  description TEXT    NOT NULL DEFAULT '',
  x           REAL    NOT NULL DEFAULT 0,
  y           REAL    NOT NULL DEFAULT 0,
  width       REAL    NOT NULL DEFAULT 400,
  height      REAL    NOT NULL DEFAULT 300
);
CREATE TABLE IF NOT EXISTS devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'other',
  zone_id     INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  description TEXT    NOT NULL DEFAULT '',
  os          TEXT    NOT NULL DEFAULT '',
  addresses   TEXT    NOT NULL DEFAULT '[]',
  services    TEXT    NOT NULL DEFAULT '[]',
  notes       TEXT    NOT NULL DEFAULT '',
  ping_host   TEXT    NOT NULL DEFAULT '',
  x           REAL    NOT NULL DEFAULT 0,
  y           REAL    NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source      INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  target      INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL DEFAULT 'lan',
  label       TEXT    NOT NULL DEFAULT '',
  notes       TEXT    NOT NULL DEFAULT ''
);
`

export function useDb(): DatabaseSync {
  if (db) return db
  const path = useRuntimeConfig().dbPath as string
  mkdirSync(dirname(path), { recursive: true })
  db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)
  const { n } = db.prepare('SELECT count(*) AS n FROM zones').get() as { n: number }
  // An empty database starts with the demo network, through the same import
  // that restores a backup.
  if (n === 0) importNetwork(db, demo as NetworkData)
  return db
}

type Row = Record<string, any>

export const toZone = (r: Row): Zone => ({
  id: r.id, name: r.name, kind: r.kind, subnet: r.subnet, color: r.color,
  description: r.description, x: r.x, y: r.y, width: r.width, height: r.height,
})

export const toDevice = (r: Row): Device => ({
  id: r.id, name: r.name, type: r.type, zoneId: r.zone_id ?? null,
  description: r.description, os: r.os,
  addresses: upgradeAddresses(JSON.parse(r.addresses || '[]'), r.ping_host ?? ''),
  services: JSON.parse(r.services || '[]'),
  notes: r.notes, x: r.x, y: r.y,
})

export const toLink = (r: Row): Link => ({
  id: r.id, source: r.source, target: r.target, kind: r.kind, label: r.label, notes: r.notes,
})

export function readNetwork(): NetworkData {
  const d = useDb()
  return {
    zones: d.prepare('SELECT * FROM zones ORDER BY id').all().map(toZone),
    devices: d.prepare('SELECT * FROM devices ORDER BY id').all().map(toDevice),
    links: d.prepare('SELECT * FROM links ORDER BY id').all().map(toLink),
  }
}

// Body validation is deliberately loose: this is a single-user tool behind
// the home network, and the form already shapes the data.
export function deviceParams(b: Partial<Device>) {
  return {
    name: String(b.name ?? '').trim() || 'Новое устройство',
    type: String(b.type ?? 'other'),
    zone_id: b.zoneId ?? null,
    description: String(b.description ?? ''),
    os: String(b.os ?? ''),
    addresses: JSON.stringify((b.addresses ?? [])
      .filter(a => a?.value?.trim())
      .map(a => ({ ...a, value: a.value.trim(), ping: Math.max(0, Number(a.ping) || 0) }))),
    services: JSON.stringify((b.services ?? []).filter(s => s?.name?.trim())),
    notes: String(b.notes ?? ''),
    // Superseded by Address.ping; kept as a column so old databases open.
    ping_host: '',
    x: Number(b.x ?? 0),
    y: Number(b.y ?? 0),
  }
}

export function zoneParams(b: Partial<Zone>) {
  return {
    name: String(b.name ?? '').trim() || 'Новая зона',
    kind: String(b.kind ?? 'other'),
    subnet: String(b.subnet ?? ''),
    color: String(b.color ?? 'zinc'),
    description: String(b.description ?? ''),
    x: Number(b.x ?? 0),
    y: Number(b.y ?? 0),
    width: Number(b.width ?? 400),
    height: Number(b.height ?? 300),
  }
}

export function linkParams(b: Partial<Link>) {
  return {
    source: Number(b.source),
    target: Number(b.target),
    kind: String(b.kind ?? 'lan'),
    label: String(b.label ?? ''),
    notes: String(b.notes ?? ''),
  }
}

export function idParam(event: any): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'bad id' })
  return id
}
