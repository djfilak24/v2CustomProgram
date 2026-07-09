"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

/**
 * Auto-rotating hero: every 4s the next image wipes in right→left over the
 * previous one (clip-path inset animation), with a slow Ken Burns drift on
 * whichever image is live. Timing bars double as progress indicators.
 */
const HOLD_MS = 4000

export function HeroCarousel({ images, children }: { images: string[]; children: React.ReactNode }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), HOLD_MS)
    return () => clearInterval(t)
  }, [images.length])

  const prev = (idx + images.length - 1) % images.length

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b1830]">
      {/* Outgoing image sits still underneath; incoming wipes over it. */}
      <div className="absolute inset-0">
        <Image src={images[prev]} alt="" fill priority className="object-cover" sizes="100vw" />
      </div>
      <div key={idx} className="absolute inset-0 hero-wipe motion-reduce:[animation:none]">
        <div className="absolute inset-0 hero-drift motion-reduce:[animation:none]">
          <Image src={images[idx]} alt="" fill priority className="object-cover" sizes="100vw" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-[#0b1830]/85" />

      {children}

      {/* Timing bars */}
      <div className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            aria-label={`Image ${i + 1}`}
            onClick={() => setIdx(i)}
            className="h-1 w-10 overflow-hidden rounded-full bg-white/25"
          >
            {i === idx && (
              <span key={idx} className="hero-timer block h-full rounded-full bg-[#00badc] motion-reduce:w-full motion-reduce:[animation:none]" />
            )}
          </button>
        ))}
      </div>

      <style>{`
        .hero-wipe { clip-path: inset(0 0 0 100%); animation: heroWipe 950ms cubic-bezier(0.77, 0, 0.18, 1) forwards; }
        @keyframes heroWipe { to { clip-path: inset(0 0 0 0); } }
        .hero-drift { animation: heroDrift ${HOLD_MS + 1200}ms linear forwards; }
        @keyframes heroDrift { from { transform: scale(1.06) translateX(1.2%); } to { transform: scale(1.13) translateX(0); } }
        .hero-timer { width: 0; animation: heroTimer ${HOLD_MS}ms linear forwards; }
        @keyframes heroTimer { to { width: 100%; } }
      `}</style>
    </section>
  )
}
