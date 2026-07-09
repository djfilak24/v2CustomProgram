"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Motion primitives for the client landing. Everything is IntersectionObserver
 * + CSS — no animation library. Reveals fire once (scrolling back up doesn't
 * re-play; the page should feel composed, not busy).
 */

export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") { setInView(true); return }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/** Fade + rise into place when scrolled into view. Stagger siblings with delay. */
export function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2)
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out will-change-transform motion-reduce:transition-none ${
        inView ? "translate-y-0 opacity-100" : "translate-y-7 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/** Cyan marker-underline that sweeps across a phrase when it scrolls into view. */
export function Highlight({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.7)
  return (
    <span
      ref={ref}
      className="bg-gradient-to-r from-[#00badc]/45 to-[#2fd0ee]/35 bg-no-repeat transition-[background-size] duration-1000 ease-out motion-reduce:transition-none"
      style={{ backgroundSize: inView ? "100% 0.4em" : "0% 0.4em", backgroundPosition: "0 92%" }}
    >
      {children}
    </span>
  )
}

/** Number that counts up (ease-out cubic) the first time it enters the viewport. */
export function CountUp({
  value, decimals = 0, prefix = "", suffix = "", duration = 1600, className = "",
}: { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.6)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}{shown.toFixed(decimals)}{suffix}
    </span>
  )
}
