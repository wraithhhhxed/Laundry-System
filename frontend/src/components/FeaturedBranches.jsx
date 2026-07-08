import React, { useEffect, useRef, useContext, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const HEADLINE_WORDS = ["Featured", "Branches."]
const SUBTEXT = "Top-notch laundry services available in your area."
const EYEBROW_RIGHT = "All Branches Available"

const FeaturedBranches = () => {
  const navigate = useNavigate()
  const { branches } = useContext(AppContext)

  const karaokeRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (karaokeRef.current) {
            const rect = karaokeRef.current.getBoundingClientRect()
            const windowH = window.innerHeight
            
            // Trigger Zone: Start at bottom (1.0), end at 20% from top (0.2)
            const start = windowH * 1.0
            const end = windowH * 0.20
            const raw = (start - rect.top) / (start - end)
            
            setScrollProgress(Math.min(1, Math.max(0, raw)))
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const subtextWords = useMemo(() => SUBTEXT.split(' '), [])
  const eyebrowRightWords = useMemo(() => EYEBROW_RIGHT.split(' '), [])

  if (!branches) return null
  const availableBranches = branches.filter(b => b.available)

  return (
    <div
      className="py-20 px-6 md:px-16 bg-white overflow-hidden"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* ── SECTION HEADER ROW ── */}
      <div ref={karaokeRef} className="flex items-end justify-between mb-3">
        <span
          className="uppercase tracking-[0.35em] text-[10px] font-sans font-bold"
          style={{
            color: scrollProgress >= 0.1 ? '#a78bfa' : '#e5e5e5',
            transition: 'color 0.3s ease-out',
          }}
        >
          Near You
        </span>

        <div className="hidden sm:flex items-center gap-1 font-sans">
          {eyebrowRightWords.map((word, i) => (
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
        <h2
          className="leading-none text-violet-900"
          style={{ fontSize: 'clamp(36px, 6vw, 80px)', fontWeight: 700, letterSpacing: '-0.03em' }}
        >
          {HEADLINE_WORDS.map((word, i) => (
            <span
              key={i}
              style={{
                color: scrollProgress >= 0.3 + (i * 0.15) ? '#4c1d95' : '#e5e5e5',
                transition: 'color 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-block',
                marginRight: '0.2em',
                willChange: 'color'
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
                marginRight: '0.25em'
              }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>

      {/* ── BRANCHES GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {availableBranches.slice(0, 6).map((item, index) => (
          <div
            key={index}
            onClick={() => { navigate(`/appointment/${item._id}`); window.scrollTo(0, 0) }}
            className="group bg-white cursor-pointer flex flex-col overflow-hidden border border-transparent hover:border-violet-50 transition-all duration-300"
          >
            <div className="overflow-hidden relative aspect-[4/3] bg-neutral-100">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-700 scale-100 group-hover:scale-110"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-sans text-[10px] uppercase tracking-widest font-bold text-green-600">
                  Available
                </span>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-1 flex-1">
              <p
                className="font-bold text-neutral-900 group-hover:text-violet-700 transition-colors duration-300 leading-tight"
                style={{ fontSize: 'clamp(16px, 1.4vw, 19px)' }}
              >
                {item.name}
              </p>
              <p className="font-sans text-xs text-neutral-400 tracking-tight">
                {Array.isArray(item.speciality) ? item.speciality.join(' · ') : item.speciality}
              </p>

              <div className="mt-auto pt-6 flex items-center justify-between">
                <span className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400 group-hover:text-violet-600 transition-colors">
                  View Details
                </span>
                <span className="text-violet-300 group-hover:text-violet-600 group-hover:translate-x-1.5 transition-all duration-300 text-lg">
                  →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── VIEW ALL BUTTON ── */}
      <div className="mt-16 flex justify-start">
        <button
          onClick={() => { navigate('/branches'); window.scrollTo(0, 0) }}
          className="group relative overflow-hidden bg-violet-600 text-white px-10 py-4 font-sans text-sm tracking-widest uppercase font-bold inline-flex items-center gap-4 transition-transform active:scale-95"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
        >
          <span className="relative z-10">View All Branches</span>
          <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
          <div className="absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-400 ease-out" />
        </button>
      </div>
    </div>
  )
}

export default FeaturedBranches