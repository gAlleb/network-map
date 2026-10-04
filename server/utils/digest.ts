// The map as read by someone who is not looking at it: another program or an
// AI that was handed the URL. Names instead of ids, labels next to codes, live
// ping state, and none of the drawing data (positions, sizes, colours).

const ABOUT = [
  'Карта домашней, офисной и облачной сети владельца. Данные ведутся вручную в интерфейсе карты; состояние пинга живое: пингует сам сервер карты, поэтому «не отвечает» значит «не отвечает с машины, где работает карта».',
  'Зона — площадка или сеть (дом, офис, облако, «в дороге»). Устройство без зоны в зону не помещено.',
  'Устройство типа mesh (NetBird, Yggdrasil) и internet — не железо, а сеть; связь с ним значит «устройство подключено к этой сети».',
  'Связь направлена от from к to. hosted: from работает внутри to (ВМ на гипервизоре). wireguard и amnezia: туннель, обычно from — клиент. internet: выход в интернет.',
  'Адрес: kind — тип адреса (lan, netbird, yggdrasil…), ping — как его проверяют: every — интервал в секундах, state — up (отвечает) / down (не отвечает) / unknown (ещё не проверен). Адрес без ping не пингуется.',
  'Сервис: url — по IP изнутри сети; localUrl — по локальному имени с настоящим сертификатом, имя резолвится только внутри сети; publicUrl — доступен из интернета. Веб-сервис — тот, у которого есть адрес http(s); остальные (службы без веба) — в otherServices.',
  'Состояние устройства: up — отвечают все пингуемые адреса, partial — часть, down — ни один, unknown — ещё не проверено, unmonitored — ничего не пингуется.',
]

type DeviceState = 'up' | 'partial' | 'down' | 'unknown' | 'unmonitored'

function deviceState(d: Device, st: StatusMap): DeviceState {
  const pinged = d.addresses.filter(a => (a.ping ?? 0) > 0)
  if (!pinged.length) return 'unmonitored'
  const states = pinged.map(a => st[d.id]?.[a.value.trim()]?.state ?? 'unknown')
  if (states.includes('unknown')) return 'unknown'
  const up = states.filter(s => s === 'up').length
  return up === states.length ? 'up' : up ? 'partial' : 'down'
}

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null)) as T

export function buildDigest() {
  const net = readNetwork()
  const st = getStatuses()
  const zoneName = new Map(net.zones.map(z => [z.id, z.name]))
  const devName = new Map(net.devices.map(d => [d.id, d.name]))

  const devices = net.devices.map(d => clean({
    name: d.name,
    type: d.type,
    zone: d.zoneId == null ? null : zoneName.get(d.zoneId) ?? null,
    os: d.os,
    description: d.description,
    state: deviceState(d, st),
    addresses: d.addresses.map((a) => {
      const s = st[d.id]?.[a.value.trim()]
      return clean({
        kind: a.kind,
        value: a.value,
        label: a.label,
        ping: a.ping ? clean({ every: a.ping, state: s?.state ?? 'unknown', rttMs: s?.rtt }) : undefined,
      })
    }),
    webServices: d.services.filter(isWebService).map(s => clean({ ...s })),
    otherServices: d.services.filter(s => !isWebService(s)).map(s => clean({ ...s })),
    notes: d.notes,
  }))

  return {
    title: 'Карта сети',
    generatedAt: new Date().toISOString(),
    about: ABOUT,
    legend: {
      zoneKinds: labels(zoneKinds),
      deviceTypes: labels(deviceTypes),
      addressKinds: labels(addressKinds),
      linkKinds: labels(linkKinds),
    },
    zones: net.zones.map(z => clean({
      name: z.name,
      kind: z.kind,
      subnet: z.subnet,
      description: z.description,
      devices: net.devices.filter(d => d.zoneId === z.id).map(d => d.name),
    })),
    devices,
    links: net.links.map(l => clean({
      from: devName.get(l.source) ?? `#${l.source}`,
      to: devName.get(l.target) ?? `#${l.target}`,
      kind: l.kind,
      label: l.label,
      notes: l.notes,
    })),
  }
}

const labels = (rec: Record<string, { label: string }>) =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v.label]))

// The same digest as Markdown: the cheapest form for a language model to read.
export function digestMarkdown(): string {
  const g = buildDigest()
  const out: string[] = [`# ${g.title}`, '', `Снято: ${g.generatedAt}`, '', '## Как читать', '']
  out.push(...g.about.map(s => `- ${s}`), '')

  const stateRu: Record<string, string> = {
    up: 'отвечает', partial: 'отвечает частично', down: 'не отвечает', unknown: 'ещё не проверено', unmonitored: 'не пингуется',
  }

  const device = (d: (typeof g.devices)[number]) => {
    out.push(`### ${d.name}`, '')
    out.push(`- Тип: ${deviceTypes[d.type]?.label ?? d.type} (\`${d.type}\`)${d.os ? `, ОС: ${d.os}` : ''}`)
    out.push(`- Состояние: ${stateRu[d.state]}`)
    if (d.description) out.push(`- Описание: ${d.description}`)
    if (d.addresses.length) {
      out.push('- Адреса:')
      for (const a of d.addresses) {
        const kind = addressKinds[a.kind]?.label ?? a.kind
        const ping = a.ping ? ` — пинг раз в ${a.ping.every} с: ${stateRu[a.ping.state]}${a.ping.rttMs != null ? `, ${a.ping.rttMs} мс` : ''}` : ''
        out.push(`  - ${kind}: \`${a.value}\`${a.label ? ` (${a.label})` : ''}${ping}`)
      }
    }
    if (d.webServices.length) {
      out.push('- Веб-сервисы:')
      for (const s of d.webServices) {
        const urls = [s.url && `${s.url} (по IP)`, s.localUrl && `${s.localUrl} (локальное имя)`, s.publicUrl && `${s.publicUrl} (из интернета)`].filter(Boolean)
        out.push(`  - ${s.name}: ${urls.join(', ')}${s.note ? ` — ${s.note}` : ''}`)
      }
    }
    if (d.otherServices.length) {
      out.push(`- Также работает: ${d.otherServices.map(s => s.note ? `${s.name} (${s.note})` : s.name).join('; ')}`)
    }
    if (d.notes) out.push(`- Заметки: ${d.notes.replace(/\n+/g, ' ')}`)
    out.push('')
  }

  for (const z of g.zones) {
    out.push(`## Зона «${z.name}» — ${zoneKinds[z.kind]?.label ?? z.kind}${z.subnet ? `, ${z.subnet}` : ''}`, '')
    if (z.description) out.push(z.description, '')
    g.devices.filter(d => d.zone === z.name).forEach(device)
  }
  const loose = g.devices.filter(d => !d.zone)
  if (loose.length) {
    out.push('## Вне зон', '')
    loose.forEach(device)
  }

  out.push('## Связи', '')
  for (const l of g.links) {
    const kind = linkKinds[l.kind]?.label ?? l.kind
    out.push(`- ${l.from} → ${l.to}: ${kind}${l.label ? ` «${l.label}»` : ''}${l.notes ? ` — ${l.notes.replace(/\n+/g, ' ')}` : ''}`)
  }
  out.push('')
  return out.join('\n')
}
