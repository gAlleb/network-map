<script setup lang="ts">
// Hand-drawn flat illustrations, one per device type. Drawn here rather than
// taken from an icon set so they share one light source and palette, and so
// the map needs nothing from the internet.
const props = withDefaults(defineProps<{ type: DeviceType, accent?: string, size?: number }>(), {
  size: 72,
})

const uid = useId()
const g = (n: string) => `${uid}-${n}`
const url = (n: string) => `url(#${g(n)})`

const accent = computed(() => props.accent || typeColors[props.type] || '#a1a1aa')
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" class="device-art">
    <defs>
      <linearGradient :id="g('body')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3f3f46" />
        <stop offset="1" stop-color="#18181b" />
      </linearGradient>
      <linearGradient :id="g('light')" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fafafa" />
        <stop offset="1" stop-color="#d4d4d8" />
      </linearGradient>
      <linearGradient :id="g('accent')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" :stop-color="accent" stop-opacity="1" />
        <stop offset="1" :stop-color="accent" stop-opacity="0.55" />
      </linearGradient>
      <linearGradient :id="g('screen')" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" :stop-color="accent" stop-opacity="0.95" />
        <stop offset="0.6" :stop-color="accent" stop-opacity="0.45" />
        <stop offset="1" stop-color="#0f172a" stop-opacity="0.9" />
      </linearGradient>
      <radialGradient :id="g('glow')" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" :stop-color="accent" stop-opacity="0.45" />
        <stop offset="1" :stop-color="accent" stop-opacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="48" cy="88" rx="30" ry="4" fill="#000" opacity="0.22" />

    <!-- Router: low box, antennas, a row of LEDs -->
    <template v-if="type === 'router'">
      <rect x="22" y="14" width="5" height="36" rx="2.5" :fill="url('body')" transform="rotate(-12 24 50)" />
      <rect x="69" y="14" width="5" height="36" rx="2.5" :fill="url('body')" transform="rotate(12 72 50)" />
      <rect x="45.5" y="18" width="5" height="30" rx="2.5" :fill="url('body')" />
      <rect x="10" y="46" width="76" height="30" rx="9" :fill="url('body')" />
      <rect x="10" y="46" width="76" height="9" rx="4.5" fill="#fff" opacity="0.08" />
      <rect x="16" y="64" width="64" height="4" rx="2" :fill="url('accent')" />
      <circle cx="22" cy="57" r="2.2" fill="#4ade80" />
      <circle cx="30" cy="57" r="2.2" fill="#4ade80" />
      <circle cx="38" cy="57" r="2.2" :fill="accent" />
      <circle cx="46" cy="57" r="2.2" fill="#facc15" />
    </template>

    <!-- Hypervisor: three rack units -->
    <template v-else-if="type === 'hypervisor'">
      <g v-for="(y, i) in [16, 38, 60]" :key="i">
        <rect x="12" :y="y" width="72" height="19" rx="5" :fill="url('body')" />
        <rect x="12" :y="y" width="72" height="5" rx="2.5" fill="#fff" opacity="0.07" />
        <rect x="18" :y="y + 7" width="30" height="5" rx="2.5" fill="#52525b" />
        <rect x="52" :y="y + 7" width="10" height="5" rx="2" :fill="url('accent')" />
        <circle cx="72" :cy="y + 9.5" r="2.2" fill="#4ade80" />
        <circle cx="78" :cy="y + 9.5" r="2.2" :fill="i === 1 ? '#facc15' : '#4ade80'" />
      </g>
    </template>

    <!-- Server: tower -->
    <template v-else-if="type === 'server'">
      <rect x="26" y="10" width="44" height="72" rx="7" :fill="url('body')" />
      <rect x="26" y="10" width="44" height="8" rx="4" fill="#fff" opacity="0.07" />
      <rect v-for="y in [22, 34, 46]" :key="y" x="32" :y="y" width="32" height="8" rx="2.5" fill="#52525b" />
      <circle v-for="y in [26, 38, 50]" :key="'l' + y" cx="59" :cy="y" r="1.8" fill="#4ade80" />
      <rect x="32" y="64" width="32" height="4" rx="2" :fill="url('accent')" />
    </template>

    <!-- VM: isometric cube -->
    <template v-else-if="type === 'vm'">
      <circle cx="48" cy="48" r="40" :fill="url('glow')" />
      <path d="M48 12 L80 30 L48 48 L16 30 Z" :fill="accent" opacity="0.95" />
      <path d="M16 30 L48 48 L48 84 L16 66 Z" :fill="accent" opacity="0.6" />
      <path d="M80 30 L48 48 L48 84 L80 66 Z" :fill="accent" opacity="0.38" />
      <path d="M48 12 L80 30 L48 48 L16 30 Z M16 30 L16 66 L48 84 L80 66 L80 30 M48 48 L48 84" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M33 34 L48 42 L63 34" stroke="#fff" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round" />
    </template>

    <!-- NAS: box with drive bays -->
    <template v-else-if="type === 'nas'">
      <rect x="16" y="16" width="64" height="66" rx="9" :fill="url('body')" />
      <rect x="16" y="16" width="64" height="10" rx="5" fill="#fff" opacity="0.07" />
      <g v-for="(x, i) in [23, 37, 51, 65]" :key="x">
        <rect :x="x" y="30" width="9" height="40" rx="2.5" fill="#3f3f46" stroke="#52525b" />
        <circle :cx="x + 4.5" cy="64" r="1.8" :fill="i === 3 ? accent : '#4ade80'" />
        <rect :x="x + 2" y="34" width="5" height="2" rx="1" fill="#71717a" />
      </g>
      <rect x="23" y="74" width="50" height="3" rx="1.5" :fill="url('accent')" />
    </template>

    <!-- VPS: cloud with a server inside -->
    <template v-else-if="type === 'vps'">
      <path d="M26 70 C12 70 10 50 24 47 C24 31 44 24 52 36 C60 26 78 31 76 47 C90 49 88 70 74 70 Z" :fill="url('accent')" />
      <path d="M26 70 C12 70 10 50 24 47 C24 31 44 24 52 36 C60 26 78 31 76 47 C90 49 88 70 74 70 Z" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5" />
      <rect x="34" y="44" width="28" height="9" rx="2.5" :fill="url('body')" />
      <rect x="34" y="56" width="28" height="9" rx="2.5" :fill="url('body')" />
      <circle cx="56" cy="48.5" r="1.6" fill="#4ade80" />
      <circle cx="56" cy="60.5" r="1.6" fill="#4ade80" />
      <rect x="38" y="47.5" width="12" height="2" rx="1" fill="#71717a" />
      <rect x="38" y="59.5" width="12" height="2" rx="1" fill="#71717a" />
    </template>

    <!-- Laptop -->
    <template v-else-if="type === 'laptop'">
      <rect x="18" y="18" width="60" height="42" rx="4" :fill="url('body')" />
      <rect x="22" y="22" width="52" height="34" rx="2" :fill="url('screen')" />
      <path d="M22 22 L52 22 L30 56 L22 56 Z" fill="#fff" opacity="0.08" />
      <path d="M10 64 L86 64 L82 72 Q81 74 78 74 L18 74 Q15 74 14 72 Z" :fill="url('light')" />
      <rect x="10" y="61" width="76" height="4" rx="2" fill="#a1a1aa" />
      <rect x="40" y="66" width="16" height="2.5" rx="1.25" fill="#a1a1aa" />
    </template>

    <!-- Desktop monitor -->
    <template v-else-if="type === 'desktop'">
      <rect x="12" y="14" width="72" height="48" rx="5" :fill="url('body')" />
      <rect x="16" y="18" width="64" height="40" rx="2" :fill="url('screen')" />
      <path d="M16 18 L50 18 L28 58 L16 58 Z" fill="#fff" opacity="0.08" />
      <path d="M42 62 L54 62 L57 76 L39 76 Z" :fill="url('light')" />
      <rect x="30" y="76" width="36" height="5" rx="2.5" :fill="url('light')" />
    </template>

    <!-- Phone -->
    <template v-else-if="type === 'phone'">
      <rect x="30" y="8" width="36" height="76" rx="9" :fill="url('body')" />
      <rect x="33" y="12" width="30" height="68" rx="6.5" :fill="url('screen')" />
      <rect x="42" y="15" width="12" height="4" rx="2" fill="#18181b" />
      <path d="M33 30 L63 18 L63 34 L33 50 Z" fill="#fff" opacity="0.08" />
      <rect x="40" y="74" width="16" height="2" rx="1" fill="#fff" opacity="0.6" />
    </template>

    <!-- Printer -->
    <template v-else-if="type === 'printer'">
      <path d="M30 14 L66 14 L66 38 L30 38 Z" fill="#fff" stroke="#d4d4d8" />
      <rect x="35" y="21" width="22" height="2.5" rx="1.25" fill="#a1a1aa" />
      <rect x="35" y="27" width="16" height="2.5" rx="1.25" fill="#a1a1aa" />
      <rect x="12" y="34" width="72" height="34" rx="8" :fill="url('light')" />
      <rect x="12" y="34" width="72" height="8" rx="4" fill="#fff" opacity="0.6" />
      <rect x="66" y="42" width="11" height="5" rx="2" :fill="url('accent')" />
      <circle cx="70" cy="54" r="2" fill="#4ade80" />
      <rect x="24" y="58" width="48" height="6" rx="2" fill="#3f3f46" />
      <path d="M28 64 L68 64 L72 80 L24 80 Z" fill="#fff" stroke="#d4d4d8" />
      <rect x="32" y="70" width="26" height="2.5" rx="1.25" :fill="accent" opacity="0.6" />
    </template>

    <!-- TV -->
    <template v-else-if="type === 'tv'">
      <rect x="6" y="18" width="84" height="52" rx="4" :fill="url('body')" />
      <rect x="9" y="21" width="78" height="46" rx="2" :fill="url('screen')" />
      <path d="M9 21 L56 21 L30 67 L9 67 Z" fill="#fff" opacity="0.07" />
      <path d="M22 70 L18 80 M74 70 L78 80" stroke="#52525b" stroke-width="3.5" stroke-linecap="round" />
    </template>

    <!-- Console: gamepad -->
    <template v-else-if="type === 'console'">
      <path d="M28 30 L68 30 C80 30 86 44 88 58 C90 72 80 80 72 72 L64 62 L32 62 L24 72 C16 80 6 72 8 58 C10 44 16 30 28 30 Z" :fill="url('light')" stroke="#d4d4d8" />
      <rect x="21" y="43" width="16" height="5" rx="2" fill="#3f3f46" />
      <rect x="26.5" y="37.5" width="5" height="16" rx="2" fill="#3f3f46" />
      <circle cx="66" cy="40" r="3.2" :fill="accent" />
      <circle cx="73" cy="46" r="3.2" fill="#ef4444" />
      <circle cx="59" cy="46" r="3.2" fill="#22c55e" />
      <circle cx="66" cy="52" r="3.2" fill="#3b82f6" />
      <circle cx="40" cy="56" r="4" fill="#3f3f46" />
      <circle cx="56" cy="56" r="4" fill="#3f3f46" />
    </template>

    <!-- Switch -->
    <template v-else-if="type === 'switch'">
      <rect x="6" y="38" width="84" height="26" rx="6" :fill="url('body')" />
      <rect x="6" y="38" width="84" height="6" rx="3" fill="#fff" opacity="0.07" />
      <g v-for="i in 8" :key="i">
        <rect :x="10 + (i - 1) * 9" y="48" width="7" height="7" rx="1" fill="#09090b" stroke="#52525b" stroke-width="0.8" />
        <circle :cx="13.5 + (i - 1) * 9" cy="59" r="1.1" :fill="i % 3 ? '#4ade80' : '#facc15'" />
      </g>
      <rect x="84" y="48" width="2" height="10" rx="1" :fill="accent" />
    </template>

    <!-- Access point -->
    <template v-else-if="type === 'ap'">
      <path d="M30 34 A25 25 0 0 1 66 34" :stroke="accent" stroke-width="4" stroke-linecap="round" opacity="0.5" />
      <path d="M37 42 A15 15 0 0 1 59 42" :stroke="accent" stroke-width="4" stroke-linecap="round" opacity="0.8" />
      <ellipse cx="48" cy="66" rx="34" ry="12" :fill="url('light')" stroke="#d4d4d8" />
      <ellipse cx="48" cy="62" rx="34" ry="12" fill="#fff" />
      <circle cx="48" cy="62" r="3" :fill="accent" />
    </template>

    <!-- Camera -->
    <template v-else-if="type === 'camera'">
      <rect x="14" y="14" width="68" height="8" rx="4" :fill="url('light')" />
      <path d="M22 22 L74 22 L74 40 A26 26 0 0 1 22 40 Z" :fill="url('light')" stroke="#d4d4d8" />
      <circle cx="48" cy="44" r="13" :fill="url('body')" />
      <circle cx="48" cy="44" r="6" :fill="url('screen')" />
      <circle cx="45.5" cy="41.5" r="1.8" fill="#fff" opacity="0.7" />
    </template>

    <!-- Overlay mesh: nodes on a ring -->
    <template v-else-if="type === 'mesh'">
      <circle cx="48" cy="46" r="40" :fill="url('glow')" />
      <circle cx="48" cy="46" r="30" :stroke="accent" stroke-width="2" stroke-dasharray="4 4" opacity="0.6" />
      <path d="M48 16 L74 61 L22 61 Z M48 16 L48 46 M74 61 L48 46 M22 61 L48 46" :stroke="accent" stroke-width="2" stroke-linejoin="round" opacity="0.85" />
      <circle cx="48" cy="46" r="8" :fill="url('accent')" stroke="#fff" stroke-width="2" />
      <circle cx="48" cy="16" r="6" fill="#fff" :stroke="accent" stroke-width="3" />
      <circle cx="74" cy="61" r="6" fill="#fff" :stroke="accent" stroke-width="3" />
      <circle cx="22" cy="61" r="6" fill="#fff" :stroke="accent" stroke-width="3" />
    </template>

    <!-- Internet: globe -->
    <template v-else-if="type === 'internet'">
      <circle cx="48" cy="46" r="40" :fill="url('glow')" />
      <circle cx="48" cy="46" r="30" :fill="url('accent')" />
      <g stroke="#fff" stroke-opacity="0.75" stroke-width="2" fill="none">
        <circle cx="48" cy="46" r="30" />
        <ellipse cx="48" cy="46" rx="13" ry="30" />
        <path d="M18 46 H78 M23 31 H73 M23 61 H73 M48 16 V76" />
      </g>
    </template>

    <!-- Anything else -->
    <template v-else>
      <rect x="20" y="16" width="56" height="64" rx="12" :fill="url('body')" />
      <circle cx="48" cy="44" r="14" :fill="url('accent')" />
      <text x="48" y="50" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">?</text>
    </template>
  </svg>
</template>

<style scoped>
.device-art { filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.18)); overflow: visible; }
</style>
