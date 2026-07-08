import React, { useContext, useEffect, useState, useRef, useMemo } from 'react'
import { AppContext } from '../context/AppContext'

const HEADLINE_WORDS = ["Frequently", "Asked", "Questions."]
const SUBTEXT = "Everything you need to know about our laundry services."
const EYEBROW_RIGHT = "Clear · Honest · Helpful"

const HomeFaqs = () => {
  const { getFaqs } = useContext(AppContext)
  const [faqs, setFaqs]       = useState([])
  const [openIdx, setOpenIdx] = useState(null)
  const [loading, setLoading] = useState(true)

  const karaokeRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // ── RAF-throttled scroll watcher (same as FeaturedBranches) ──
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (karaokeRef.current) {
            const rect    = karaokeRef.current.getBoundingClientRect()
            const windowH = window.innerHeight
            const start   = windowH * 1.0
            const end     = windowH * 0.20
            const raw     = (start - rect.top) / (start - end)
            setScrollProgress(Math.min(1, Math.max(0, raw)))
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    getFaqs()
      .then(data => setFaqs(data.filter(f => f.active)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (i) => setOpenIdx(prev => prev === i ? null : i)

  const subtextWords   = useMemo(() => SUBTEXT.split(' '), [])
  const eyebrowRWords  = useMemo(() => EYEBROW_RIGHT.split(' '), [])

  if (!loading && faqs.length === 0) return null

  return (
    <section
      id="faqs"
      className="py-20 px-6 md:px-16 bg-white scroll-mt-[70px]"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* ── SECTION HEADER ROW ── */}
      <div className="flex items-end justify-between mb-3">
        <span
          className="uppercase tracking-[0.35em] text-[10px] font-sans font-bold"
          style={{
            color: scrollProgress >= 0.1 ? '#a78bfa' : '#e5e5e5',
            transition: 'color 0.3s ease-out',
          }}
        >
          Got Questions?
        </span>

        <div className="hidden sm:flex items-center gap-1 font-sans">
          {eyebrowRWords.map((word, i) => (
            <span
              key={i}
              className="uppercase tracking-[0.35em] text-[10px] font-bold"
              style={{
                color: scrollProgress >= 0.1 + (i * 0.05) ? '#d4d4d4' : '#f5f5f5',
                transition: 'color 0.25s ease-out',
              }}
            >
              {word}{'\u00A0'}
            </span>
          ))}
        </div>
      </div>

      <div className="h-px bg-violet-100 mb-10" />

      {/* ── HEADLINE + SUBTEXT ── */}
      <div ref={karaokeRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">

        <h2
          className="leading-none"
          style={{
            fontSize: 'clamp(28px, 5vw, 72px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
          }}
        >
          {HEADLINE_WORDS.map((word, i) => (
            <span
              key={i}
              style={{
                color: scrollProgress >= 0.3 + (i * 0.15) ? '#4c1d95' : '#e5e5e5',
                transition: 'color 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-block',
                marginRight: '0.2em',
                willChange: 'color',
              }}
            >
              {word}
            </span>
          ))}
        </h2>

        <p className="font-sans text-sm md:text-base max-w-xs leading-relaxed md:text-right">
          {subtextWords.map((word, i) => (
            <span
              key={i}
              style={{
                color: scrollProgress >= 0.5 + (i * 0.04) ? '#737373' : '#f5f5f5',
                transition: 'color 0.3s ease-out',
                display: 'inline-block',
                marginRight: '0.25em',
              }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>

      {/* ── FAQ ACCORDION — unchanged ── */}
      <div className="max-w-3xl">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-violet-50 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border-b border-violet-100 last:border-b-0"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between py-5 text-left gap-6 group"
                >
                  <span
                    className="font-sans font-semibold text-sm md:text-base transition-colors duration-200"
                    style={{ color: openIdx === i ? '#4c1d95' : '#262626' }}
                  >
                    {faq.question}
                  </span>
                  <span
                    className="flex-shrink-0 font-sans text-lg font-light transition-transform duration-300"
                    style={{
                      color: '#7c3aed',
                      transform: openIdx === i ? 'rotate(45deg)' : 'rotate(0deg)',
                      display: 'inline-block',
                    }}
                  >
                    +
                  </span>
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: openIdx === i ? '300px' : '0px' }}
                >
                  <p className="font-sans text-sm text-neutral-500 leading-relaxed pb-5 pr-10">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default HomeFaqs