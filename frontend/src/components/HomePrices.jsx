import React, { useContext, useEffect, useState, useRef } from 'react'
import { AppContext } from '../context/AppContext'

const HEADLINE_WORDS = ["Simple,", "Honest", "Prices."]
const SUBTEXT = "No hidden charges. What you see is what you pay."

const HomePrices = () => {
  const { getPrices } = useContext(AppContext)
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)

  const karaokeRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!karaokeRef.current) return
      const rect = karaokeRef.current.getBoundingClientRect()
      const windowH = window.innerHeight
      const start = windowH * 0.95
      const end   = windowH * 0.2
      const raw   = (start - rect.top) / (start - end)
      setScrollProgress(Math.min(1, Math.max(0, raw)))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    getPrices()
      .then(data => setPrices(data.filter(p => p.active)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) =>
    `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  const subtextWords = SUBTEXT.split(/(\s+)/).filter(t => t.trim().length > 0)

  if (!loading && prices.length === 0) return null

  return (
    <section
      id="prices"
      className="py-20 px-6 md:px-16 bg-white scroll-mt-[70px]"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* ── section header row — static ── */}
      <div className="flex items-end justify-between mb-3">
        <span className="uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans">
          Transparent Pricing
        </span>
        <span className="uppercase tracking-[0.35em] text-[10px] text-neutral-300 font-sans hidden sm:block">
          Clear · Fair · Upfront
        </span>
      </div>

      <div className="h-px bg-violet-100 mb-10" />

      {/* ── headline + subtext row — karaoke ── */}
      <div ref={karaokeRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">

        <h2
          className="leading-none text-violet-900"
          style={{
            fontSize: 'clamp(36px, 6vw, 80px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
          }}
        >
          {HEADLINE_WORDS.map((word, i) => {
            const frac = (i / HEADLINE_WORDS.length) * 0.40
            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    color: scrollProgress >= frac ? 'inherit' : '#d4d4d4',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {word}
                </span>
                {i < HEADLINE_WORDS.length - 1 && ' '}
              </React.Fragment>
            )
          })}
        </h2>

        <p className="font-sans text-sm md:text-base max-w-xs leading-relaxed md:text-right">
          {subtextWords.map((word, i) => {
            const frac = 0.40 + (i / subtextWords.length) * 0.60
            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    color: scrollProgress >= frac ? '#a3a3a3' : '#e5e5e5',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {word}
                </span>
                {' '}
              </React.Fragment>
            )
          })}
        </p>

      </div>

      {/* ── price list ── */}
      {loading ? (
        <div className="space-y-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-violet-50 animate-pulse border-b border-violet-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="max-w-2xl space-y-0">
            {prices.map((item, i) => (
              <div
                key={i}
                className="group flex items-center justify-between gap-6 py-5 border-b border-violet-100 last:border-b-0"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-sans font-semibold text-sm text-neutral-800 group-hover:text-violet-700 transition-colors duration-200 leading-snug">
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                  <span
                    className="font-sans font-bold text-violet-600"
                    style={{ fontSize: 'clamp(15px, 2vw, 18px)' }}
                  >
                    {fmt(item.price)}
                  </span>
                  <span className="font-sans text-[10px] tracking-widest uppercase text-violet-300">
                    per load
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="font-sans text-xs text-neutral-400 mt-10">
            Prices may vary per branch. Final amount is shown at checkout.
          </p>
        </>
      )}
    </section>
  )
}

export default HomePrices