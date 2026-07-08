"use client"

import { useMemo, useRef, useState } from "react"
import { Crown } from "lucide-react"
import type { ProgramMap, MapBubble } from "@/lib/survey/programMap"
import { adjacencyColor } from "@/lib/survey/sections"

/**
 * The whiteboard: renders a ProgramMap as a pan/zoom SVG. Department clusters
 * (tinted hulls), space bubbles sized by SF, named offices with crowned
 * leaders, count chips for unnamed seats, the shared program band in the
 * center, and ranked adjacency links. Read-first: hover for detail, click a
 * cluster to spotlight it.
 */
export function ProgramMapView({ map }: { map: ProgramMap }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState(() => ({ x: 0, y: 0, w: map.width, h: map.height }))
  const drag = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null)

  // Reset the viewport when a different map arrives (demo switch).
  const mapKey = `${map.width}x${map.height}x${map.clusters.length}`
  const lastKey = useRef(mapKey)
  if (lastKey.current !== mapKey) {
    lastKey.current = mapKey
    setView({ x: 0, y: 0, w: map.width, h: map.height })
    setSelected(null)
  }

  const toWorld = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: view.x + ((clientX - rect.left) / rect.width) * view.w,
      y: view.y + ((clientY - rect.top) / rect.height) * view.h,
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12
    const p = toWorld(e.clientX, e.clientY)
    setView((v) => {
      const w = Math.min(map.width * 3, Math.max(map.width / 8, v.w * factor))
      const h = (w / v.w) * v.h
      return { x: p.x - ((p.x - v.x) / v.w) * w, y: p.y - ((p.y - v.y) / v.h) * h, w, h }
    })
  }
  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    setView((v) => ({
      ...v,
      x: drag.current!.vx - ((e.clientX - drag.current!.px) / rect.width) * v.w,
      y: drag.current!.vy - ((e.clientY - drag.current!.py) / rect.height) * v.h,
    }))
  }
  const onPointerUp = () => { drag.current = null }

  const byId = useMemo(() => new Map(map.clusters.map((c) => [c.deptId, c])), [map])
  const dim = (deptId?: string) => (selected && deptId !== selected ? 0.22 : 1)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* dotted whiteboard grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(rgba(15,23,42,0.10) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      />
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="relative block h-[640px] w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => { setView({ x: 0, y: 0, w: map.width, h: map.height }); setSelected(null) }}
      >
        {/* Adjacency links — ranked color + weight, behind everything */}
        {map.links.map((l) => {
          const a = byId.get(l.a)!, b = byId.get(l.b)!
          const color = adjacencyColor(l.rank, l.total)
          const opac = selected && l.a !== selected && l.b !== selected ? 0.12 : 0.8
          return (
            <g key={`${l.a}|${l.b}`} opacity={opac}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={Math.max(1.5, 5 - l.rank * 1.4)} strokeDasharray="7 6" strokeLinecap="round" />
              <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={9} fill="#ffffff" stroke={color} strokeWidth={1.5} />
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{l.rank + 1}</text>
            </g>
          )
        })}

        {/* Shared program band */}
        <g opacity={selected ? 0.35 : 1}>
          <circle cx={map.cx} cy={map.cy} r={map.sharedR} fill="rgba(15,23,42,0.025)" stroke="rgba(15,23,42,0.22)" strokeDasharray="4 5" />
          <text x={map.cx} y={map.cy - map.sharedR + 20} textAnchor="middle" fontSize={11} fontWeight={600} letterSpacing={1.2} fill="rgba(71,85,105,0.85)">
            SHARED PROGRAM
          </text>
          {map.shared.map((b) => (
            <SharedBubble key={b.id} b={b} ox={map.cx} oy={map.cy} />
          ))}
        </g>

        {/* Department clusters */}
        {map.clusters.map((c) => (
          <g
            key={c.deptId}
            opacity={dim(c.deptId)}
            onClick={(e) => { e.stopPropagation(); setSelected((s) => (s === c.deptId ? null : c.deptId)) }}
            className="cursor-pointer"
          >
            <circle cx={c.x} cy={c.y} r={c.r} fill={c.color} fillOpacity={0.07} stroke={c.color} strokeOpacity={0.45} strokeDasharray="5 5" />
            <text x={c.x} y={c.y - c.r - 12} textAnchor="middle" fontSize={15} fontWeight={700} fill="#0f172a">{c.name}</text>
            <text x={c.x} y={c.y - c.r + 5 - 12 + 16} textAnchor="middle" fontSize={10.5} fill="rgba(100,116,139,0.9)">
              {c.headcount} people
            </text>
            {c.bubbles.map((b) => (
              <ClusterBubble key={b.id} b={b} ox={c.x} oy={c.y} color={c.color} />
            ))}
          </g>
        ))}
      </svg>

      {/* Legend + hints */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white/90 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200 backdrop-blur-sm">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-500 bg-transparent" /> office (named)</span>
        <span className="flex items-center gap-1.5"><Crown className="h-3 w-3 text-amber-500" /> leader</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" /> ×N seats</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded bg-cyan-600" /> adjacency (ranked)</span>
        <span className="text-slate-400">scroll to zoom · drag to pan · click a team to spotlight · double-click to reset</span>
      </div>
    </div>
  )
}

function ClusterBubble({ b, ox, oy, color }: { b: MapBubble; ox: number; oy: number; color: string }) {
  const x = ox + b.x, y = oy + b.y
  if (b.kind === "office") {
    return (
      <g>
        <title>{b.person ? `${b.person} — private office · ${b.sf} SF` : `Private office · ${b.sf} SF`}</title>
        <circle cx={x} cy={y} r={b.r} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.5} />
        {b.crowned && (
          <text x={x} y={y - (b.person ? 4 : -4)} textAnchor="middle" fontSize={11} fill="#d97706">♛</text>
        )}
        {b.person ? (
          <text x={x} y={y + 8} textAnchor="middle" fontSize={9} fontWeight={600} fill="#0f172a">
            {b.person.length > 14 ? b.person.slice(0, 13) + "…" : b.person}
          </text>
        ) : (
          <text x={x} y={y + 3.5} textAnchor="middle" fontSize={9} fill="rgba(51,65,85,0.9)">office</text>
        )}
      </g>
    )
  }
  const fill = b.kind === "collab" ? "rgba(15,23,42,0.07)" : b.kind === "flex" ? "rgba(15,23,42,0.04)" : "rgba(15,23,42,0.09)"
  return (
    <g>
      <title>{`${b.count ?? ""} ${b.sublabel ?? b.label} · ~${Math.round(b.sf).toLocaleString()} SF`}</title>
      <circle cx={x} cy={y} r={b.r} fill={fill} stroke="rgba(15,23,42,0.35)" strokeWidth={1} strokeDasharray={b.kind === "flex" ? "3 3" : undefined} />
      <text x={x} y={y + 1} textAnchor="middle" fontSize={Math.min(15, b.r * 0.5)} fontWeight={700} fill="#0f172a">{b.label}</text>
      {b.sublabel && (
        <text x={x} y={y + Math.min(15, b.r * 0.5) + 2} textAnchor="middle" fontSize={8.5} fill="rgba(71,85,105,0.9)">
          {b.sublabel.length > 20 ? b.sublabel.slice(0, 19) + "…" : b.sublabel}
        </text>
      )}
    </g>
  )
}

function SharedBubble({ b, ox, oy }: { b: MapBubble; ox: number; oy: number }) {
  const x = ox + b.x, y = oy + b.y
  const isCollab = b.kind === "shared-collab"
  return (
    <g>
      <title>{`${b.count} × ${b.sublabel} · ~${Math.round(b.sf).toLocaleString()} SF (proposed)`}</title>
      <circle cx={x} cy={y} r={b.r} fill={isCollab ? "rgba(0,186,220,0.10)" : "rgba(15,23,42,0.05)"} stroke={isCollab ? "rgba(0,137,163,0.6)" : "rgba(15,23,42,0.3)"} strokeWidth={1.2} />
      <text x={x} y={y + 1} textAnchor="middle" fontSize={Math.min(13, b.r * 0.48)} fontWeight={700} fill="#0f172a">{b.label}</text>
      {b.sublabel && (
        <text x={x} y={y + Math.min(13, b.r * 0.48) + 2} textAnchor="middle" fontSize={8} fill="rgba(71,85,105,0.9)">
          {b.sublabel.length > 22 ? b.sublabel.slice(0, 21) + "…" : b.sublabel}
        </text>
      )}
    </g>
  )
}
