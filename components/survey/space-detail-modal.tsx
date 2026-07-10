"use client"

import Image from "next/image"
import { X, Ruler, Users, Scale } from "lucide-react"
import type { CatalogSpace } from "@/lib/survey/catalog"

/**
 * The space-type drill-down: photo, what it is, and how teams actually use it —
 * so a respondent fully understands a space before saying they need it.
 * TODO(imagery): photos are placeholder office shots until NELSON supplies
 * space-type photography.
 */
export function SpaceDetailModal({ space, onClose }: { space: CatalogSpace; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`About ${space.label}`}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-52 sm:h-60">
          <Image src={space.photo} alt="" fill className="rounded-t-2xl object-cover" />
          <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="absolute bottom-3 left-5 text-xl font-bold text-white">{space.label}</h3>
        </div>

        <div className="p-5 sm:p-6">
          {/* Spec chips */}
          <div className="flex flex-wrap gap-2">
            <Spec icon={<Ruler className="h-3.5 w-3.5" />} label={`${space.sfEach.toLocaleString()} SF each`} />
            {space.capacity && <Spec icon={<Users className="h-3.5 w-3.5" />} label={`Seats ${space.capacity}`} />}
            <Spec icon={<Scale className="h-3.5 w-3.5" />} label={space.ratio} />
          </div>

          <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{space.description}</p>

          <h4 className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#0089a3]">How it&apos;s used</h4>
          <ul className="mt-2 space-y-1.5">
            {space.uses.map((u) => (
              <li key={u} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00badc]" />
                {u}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-slate-400">
            Sized by NELSON planning ratios — the count in your program comes from your headcount and
            how your teams work, and we confirm every one of these together in the working session.
          </p>
        </div>
      </div>
    </div>
  )
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00badc]/10 px-3 py-1 text-xs font-medium text-[#0089a3]">
      {icon} {label}
    </span>
  )
}
