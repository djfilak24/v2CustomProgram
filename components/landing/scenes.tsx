"use client"

/**
 * Animated SVG scenes for the client landing — self-contained SMIL loops, no
 * animation library. Each one previews a real artifact of the engagement
 * (aggregation into a program, the Workplace Profile radar, the Program Map)
 * so the page sells the experience with the experience's own visuals.
 */

const DEPTS = [
  { name: "Leadership", color: "#06b6d4", x: 84, y: 66 },
  { name: "Engineering", color: "#3b82f6", x: 556, y: 76 },
  { name: "Sales", color: "#8b5cf6", x: 70, y: 288 },
  { name: "Operations", color: "#f97316", x: 320, y: 36 },
  { name: "People", color: "#10b981", x: 560, y: 286 },
]
const CX = 320
const CY = 186

/** Dots stream from every team into one program — the whole pitch in one loop. */
export function AggregationScene() {
  return (
    <svg viewBox="0 0 640 360" className="h-auto w-full" role="img" aria-label="Answers from every team aggregate into one program">
      {/* Faint dot grid, the whiteboard texture */}
      <defs>
        <pattern id="agg-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" fill="#cbd5e1" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="640" height="360" fill="url(#agg-grid)" />

      {/* Traveling dots */}
      {DEPTS.map((d, di) =>
        [0, 1, 2].map((k) => {
          const dur = 3.4 + di * 0.25
          const begin = `${(di * 0.55 + k * 1.15).toFixed(2)}s`
          const mx = (d.x + CX) / 2 + (di % 2 === 0 ? 46 : -46)
          const my = (d.y + CY) / 2 + (di % 2 === 0 ? -34 : 34)
          return (
            <circle key={`${d.name}-${k}`} r={k === 1 ? 5 : 3.6} fill={d.color} opacity="0">
              <animateMotion
                path={`M ${d.x} ${d.y} Q ${mx} ${my} ${CX} ${CY}`}
                dur={`${dur}s`} begin={begin} repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.12;0.78;1"
                dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
            </circle>
          )
        }),
      )}

      {/* Department sources */}
      {DEPTS.map((d) => (
        <g key={d.name}>
          <circle cx={d.x} cy={d.y} r="7" fill={d.color} opacity="0.9" />
          <circle cx={d.x} cy={d.y} r="12" fill="none" stroke={d.color} strokeOpacity="0.35">
            <animate attributeName="r" values="10;15;10" dur="3.2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.4;0.08;0.4" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <text x={d.x} y={d.y + (d.y > CY ? 28 : -20)} textAnchor="middle"
            fontSize="12" fontWeight="600" fill="#475569">{d.name}</text>
        </g>
      ))}

      {/* The program, receiving */}
      <circle cx={CX} cy={CY} r="60" fill="#00badc" opacity="0.1">
        <animate attributeName="r" values="58;66;58" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx={CX} cy={CY} r="46" fill="#ffffff" stroke="#00badc" strokeWidth="2">
        <animate attributeName="r" values="45;48;45" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx={CX - 12} cy={CY - 8} r="11" fill="#06b6d4" opacity="0.85" />
      <circle cx={CX + 13} cy={CY - 4} r="8" fill="#8b5cf6" opacity="0.85" />
      <circle cx={CX + 1} cy={CY + 14} r="9" fill="#f97316" opacity="0.85" />
      <text x={CX} y={CY + 78} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
        One program
      </text>
    </svg>
  )
}

/** The Workplace Profile radar, breathing between two plausible shapes. */
export function RadarTeaser() {
  const A = "130,64 164,100 187,153 130,167 69,155 93,98"
  const B = "130,77 184,89 170,143 130,186 86,145 79,91"
  const axes: Array<[string, number, number]> = [
    ["Collaboration", 130, 30], ["Flexibility", 216, 76], ["Growth", 216, 168],
    ["Density", 130, 214], ["Privacy", 44, 168], ["Amenity", 44, 76],
  ]
  return (
    <svg viewBox="0 0 260 240" className="h-auto w-full" role="img" aria-label="A workplace profile radar chart">
      {["130,42 197,81 197,159 130,198 63,159 63,81",
        "130,68 175,94 175,146 130,172 85,146 85,94",
        "130,94 152,107 152,133 130,146 108,133 108,107"].map((pts) => (
        <polygon key={pts} points={pts} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {["130,42", "197,81", "197,159", "130,198", "63,159", "63,81"].map((p) => {
        const [x, y] = p.split(",").map(Number)
        return <line key={p} x1="130" y1="120" x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
      })}
      <polygon points={A} fill="#00badc" fillOpacity="0.22" stroke="#00badc" strokeWidth="2" strokeLinejoin="round">
        <animate attributeName="points" values={`${A};${B};${A}`} dur="9s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
      </polygon>
      {axes.map(([label, x, y]) => (
        <text key={label} x={x} y={y} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#64748b">{label}</text>
      ))}
    </svg>
  )
}

/** The Program Map: two team neighborhoods, gently alive, pulled by adjacency. */
export function MapTeaser() {
  return (
    <svg viewBox="0 0 260 240" className="h-auto w-full" role="img" aria-label="A program map of team neighborhoods">
      <defs>
        <pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1" fill="#cbd5e1" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="260" height="240" rx="12" fill="url(#map-grid)" />

      <line x1="96" y1="102" x2="168" y2="146" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-40" dur="3s" repeatCount="indefinite" />
      </line>
      <circle cx="132" cy="124" r="9" fill="#0f172a" />
      <text x="132" y="127.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">1</text>

      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -4;0 0" dur="5.5s" repeatCount="indefinite" />
        <ellipse cx="82" cy="84" rx="56" ry="46" fill="#06b6d4" fillOpacity="0.12" stroke="#06b6d4" strokeOpacity="0.45" />
        <circle cx="64" cy="72" r="16" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
        <circle cx="100" cy="66" r="11" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
        <circle cx="84" cy="104" r="13" fill="#06b6d4" fillOpacity="0.35" stroke="#06b6d4" strokeWidth="1.5" />
        <text x="82" y="42" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0e7490">Engineering</text>
      </g>

      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 4;0 0" dur="6.5s" repeatCount="indefinite" />
        <ellipse cx="184" cy="166" rx="52" ry="44" fill="#8b5cf6" fillOpacity="0.12" stroke="#8b5cf6" strokeOpacity="0.45" />
        <circle cx="168" cy="152" r="14" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="202" cy="164" r="10" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
        <circle cx="180" cy="188" r="12" fill="#8b5cf6" fillOpacity="0.35" stroke="#8b5cf6" strokeWidth="1.5" />
        <text x="184" y="228" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#6d28d9">Sales</text>
      </g>
    </svg>
  )
}

/* ── Step vignettes — the three steps, shown instead of told ─────────────── */

/** Rows of a workbook filling in, one leader at a time, ending on a check. */
export function WorkbookVignette() {
  const rows = [0, 1, 2, 3, 4]
  const DUR = 6
  return (
    <svg viewBox="0 0 300 190" className="h-auto w-full" role="img" aria-label="A workbook filling in">
      <rect x="46" y="22" width="208" height="146" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <rect x="46" y="22" width="208" height="26" rx="10" fill="#0e1a2e" />
      <rect x="46" y="38" width="208" height="10" fill="#0e1a2e" />
      <circle cx="62" cy="35" r="3.5" fill="#00badc" />
      <rect x="72" y="31.5" width="64" height="7" rx="3.5" fill="#ffffff" opacity="0.85" />
      {rows.map((i) => {
        const y = 60 + i * 21
        const s = 0.06 + i * 0.13
        return (
          <g key={i}>
            <rect x="60" y={y} width="86" height="9" rx="4.5" fill="#e2e8f0" />
            <rect x="156" y={y - 3} width="84" height="15" rx="4" fill="#e9f7fb" stroke="#00badc" strokeOpacity="0.35" />
            <rect x="160" y={y} width="58" height="9" rx="4.5" fill="#00badc" opacity="0">
              <animate attributeName="opacity" values="0;0;0.9;0.9;0"
                keyTimes={`0;${s};${(s + 0.05).toFixed(2)};0.9;1`} dur={`${DUR}s`} repeatCount="indefinite" />
            </rect>
          </g>
        )
      })}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.74;0.79;0.9;1" dur={`${DUR}s`} repeatCount="indefinite" />
        <circle cx="254" cy="168" r="14" fill="#10b981" />
        <path d="M 247 168 l 5 5 l 9 -10" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/** Answers on the left become sized spaces on the right. */
export function ProgramVignette() {
  const DUR = 6
  const bars = [
    { y: 52, w: 88, color: "#06b6d4", s: 0.18 },
    { y: 86, w: 64, color: "#8b5cf6", s: 0.34 },
    { y: 120, w: 104, color: "#f97316", s: 0.5 },
  ]
  return (
    <svg viewBox="0 0 300 190" className="h-auto w-full" role="img" aria-label="Answers turning into a sized program">
      {[46, 80, 114].map((y) => (
        <g key={y}>
          <rect x="24" y={y} width="70" height="10" rx="5" fill="#e2e8f0" />
          <rect x="24" y={y + 14} width="46" height="7" rx="3.5" fill="#eef2f7" />
        </g>
      ))}
      <path d="M 108 96 h 22 m -7 -7 l 7 7 l -7 7" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {bars.map((b) => (
        <g key={b.y}>
          <rect x="146" y={b.y} width="118" height="16" rx="5" fill="#f1f5f9" />
          <rect x="146" y={b.y} height="16" rx="5" fill={b.color} opacity="0.85" width="0">
            <animate attributeName="width" values={`0;0;${b.w};${b.w};0`}
              keyTimes={`0;${b.s};${(b.s + 0.16).toFixed(2)};0.9;1`} dur={`${DUR}s`} repeatCount="indefinite" />
          </rect>
        </g>
      ))}
      <text x="146" y="160" fontSize="11" fontWeight="600" fill="#64748b">
        Sized by planning ratios
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.62;0.9;1" dur={`${DUR}s`} repeatCount="indefinite" />
      </text>
    </svg>
  )
}

/** The live session: a bubble gets dragged, the adjacency holds, it lands. */
export function SessionVignette() {
  const DUR = 7
  const MOVE = "0 0;0 0;38 -18;38 -18;0 0"
  const KT = "0;0.18;0.42;0.82;1"
  return (
    <svg viewBox="0 0 300 190" className="h-auto w-full" role="img" aria-label="A bubble being moved in a live working session">
      <rect x="20" y="18" width="260" height="154" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <line x1="106" y1="96" x2="196" y2="88" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-40" dur="3s" repeatCount="indefinite" />
      </line>
      <g>
        <circle cx="86" cy="100" r="26" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="2" />
        <text x="86" y="104" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0e7490">Ops</text>
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values={MOVE} keyTimes={KT} dur={`${DUR}s`}
          repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" />
        <circle cx="196" cy="88" r="30" fill="#8b5cf6" fillOpacity="0.2" stroke="#8b5cf6" strokeWidth="2" />
        <text x="196" y="92" textAnchor="middle" fontSize="10" fontWeight="700" fill="#6d28d9">Sales</text>
        {/* Cursor riding the bubble */}
        <path d="M 214 104 l 0 14 l 4 -4 l 6 6 l 3 -3 l -6 -6 l 5 -3 z" fill="#0f172a" />
      </g>
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.46;0.52;0.82;1" dur={`${DUR}s`} repeatCount="indefinite" />
        <circle cx="252" cy="46" r="13" fill="#10b981" />
        <path d="M 245.5 46 l 4.5 4.5 l 8.5 -9" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
