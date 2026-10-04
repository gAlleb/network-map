<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, type GraphNode } from '@vue-flow/core'

defineOptions({ inheritAttrs: false })

// A "floating" edge: it is drawn between node borders along the line joining
// the centres, so it does not matter which handle a link was drawn from.
const props = defineProps<{
  id: string
  sourceNode: GraphNode
  targetNode: GraphNode
  data: { linkId: number, kind: LinkKind, label: string, dim?: boolean, offset?: number }
  selected?: boolean
}>()

const { selection } = useNetwork()
const style = computed(() => linkKinds[props.data.kind] ?? linkKinds.other)

function center(n: GraphNode) {
  return {
    x: n.computedPosition.x + (n.dimensions.width || 0) / 2,
    y: n.computedPosition.y + (n.dimensions.height || 0) / 2,
  }
}

// Point where the segment from n's centre towards `to` leaves n's box,
// pulled in a little so lines do not touch the node outline.
function borderPoint(n: GraphNode, to: { x: number, y: number }) {
  const c = center(n)
  const w = (n.dimensions.width || 1) / 2 - 6
  const h = (n.dimensions.height || 1) / 2 - 6
  const dx = to.x - c.x
  const dy = to.y - c.y
  if (!dx && !dy) return c
  const t = Math.min(w / Math.abs(dx || 1e-9), h / Math.abs(dy || 1e-9))
  return { x: c.x + dx * Math.min(t, 1), y: c.y + dy * Math.min(t, 1) }
}

// Several links between the same two devices bow apart instead of lying on
// top of each other.
const geom = computed(() => {
  const s = borderPoint(props.sourceNode, center(props.targetNode))
  const t = borderPoint(props.targetNode, center(props.sourceNode))
  const off = props.data.offset ?? 0
  const mx = (s.x + t.x) / 2
  const my = (s.y + t.y) / 2
  if (!off) return { path: `M ${s.x},${s.y} L ${t.x},${t.y}`, mx, my }
  const len = Math.hypot(t.x - s.x, t.y - s.y) || 1
  const nx = -(t.y - s.y) / len
  const ny = (t.x - s.x) / len
  const cx = mx + nx * off * 2
  const cy = my + ny * off * 2
  return { path: `M ${s.x},${s.y} Q ${cx},${cy} ${t.x},${t.y}`, mx: mx + nx * off, my: my + ny * off }
})
</script>

<template>
  <g :class="['link-edge', { animated: style.animated, selected, dim: data.dim }]">
    <BaseEdge
      :id="id"
      :path="geom.path"
      :interaction-width="18"
      :style="{
        stroke: style.color,
        strokeWidth: (style.width ?? 1.5) + (selected ? 1.5 : 0),
        strokeDasharray: style.dash,
        strokeLinecap: 'round',
      }"
    />
    <circle v-if="style.animated && !data.dim" r="3" :fill="style.color" class="pulse">
      <animateMotion :dur="`${3 + (data.linkId % 4)}s`" repeatCount="indefinite" :path="geom.path" />
    </circle>
  </g>
  <EdgeLabelRenderer v-if="data.label">
    <div
      class="edge-label nodrag nopan"
      :class="{ selected, dim: data.dim }"
      :style="{ transform: `translate(-50%, -50%) translate(${geom.mx}px, ${geom.my}px)`, '--c': style.color }"
      @click="selection = { kind: 'link', id: data.linkId }"
    >
      {{ data.label }}
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.link-edge.animated :deep(path.vue-flow__edge-path) { animation: dash-flow 1.2s linear infinite; }
.link-edge.dim { opacity: 0.18; }
.pulse { filter: drop-shadow(0 0 4px currentColor); }
@keyframes dash-flow { to { stroke-dashoffset: -26; } }
.edge-label {
  position: absolute; pointer-events: all; white-space: nowrap;
  font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  color: var(--c); background: var(--ui-bg); border: 1px solid color-mix(in oklab, var(--c) 45%, transparent);
  box-shadow: 0 2px 6px rgb(0 0 0 / .08); cursor: pointer;
}
.edge-label.selected { background: var(--c); color: white; }
.edge-label.dim { opacity: 0.25; }
</style>
