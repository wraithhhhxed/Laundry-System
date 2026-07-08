import React, { useEffect, useState, useRef, useContext, useMemo } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { AppContext } from '../context/AppContext'

const SERVICE_ICONS = {
  'Wash Only':    '🫧',
  'Wash & Dry':   '🌀',
  'Wash&Dry':     '🌀',
  'Dry Clean':    '👔',
  'Fold Only':    '👕',
  'Iron Press':   '♨️',
  'Full Service': '✨',
}

const HEADLINE_WORDS = ["Our", "Services."]
const SUBTEXT = "Professional laundry services tailored to meet your needs."
const EYEBROW_RIGHT = "Professional · Reliable · Fast"

const SpecialityMenu = () => {
  const { backendUrl } = useContext(AppContext)
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)

  const karaokeRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  // ── Same RAF-throttled scroll watcher as FeaturedBranches ──
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (karaokeRef.current) {
            const rect    = karaokeRef.current.getBoundingClientRect()
            const windowH = window.innerHeight
            // Trigger zone: element bottom enters viewport → sits 20% from top
            const start = windowH * 1.0
            const end   = windowH * 0.20
            const raw   = (start - rect.top) / (start - end)
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
    const fetchServices = async () => {
      try {
        const { data } = await axios.get(backendUrl + '/api/user/services')
        if (data.success) setServices(data.data.services)
      } catch (err) {
        console.error('Failed to load services', err)
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [backendUrl])

  const subtextWords    = useMemo(() => SUBTEXT.split(' '), [])
  const eyebrowRWords   = useMemo(() => EYEBROW_RIGHT.split(' '), [])

  return (
    <div
      id="speciality"
      className="py-20 px-6 md:px-16 bg-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* ── SECTION HEADER ROW — same reveal timing as FeaturedBranches ── */}
      <div className="flex items-end justify-between mb-3">
        <span
          className="uppercase tracking-[0.35em] text-[10px] font-sans font-bold"
          style={{
            color: scrollProgress >= 0.1 ? '#a78bfa' : '#e5e5e5',
            transition: 'color 0.3s ease-out',
          }}
        >
          What We Offer
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

      {/* ── HEADLINE + SUBTEXT — karaoke identical to FeaturedBranches ── */}
      <div ref={karaokeRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">

        <h2
          className="leading-none"
          style={{
            fontSize: 'clamp(36px, 6vw, 80px)',
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

      {/* ── SERVICE CARDS — unchanged ── */}
      {loading ? (
        <div className="flex flex-wrap gap-10 justify-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 w-28">
              <div className="w-24 h-24 bg-violet-50 animate-pulse rounded" />
              <div className="w-16 h-3 bg-violet-50 rounded animate-pulse" />
              <div className="w-10 h-3 bg-violet-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-10 md:gap-14 justify-center">
          {services.map((service) => (
            <Link
              key={service._id}
              to={`/branches/${service.name}`}
              onClick={() => scrollTo(0, 0)}
              className="group flex flex-col items-center gap-3 flex-shrink-0"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-center justify-center w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <span className="text-4xl transition-transform duration-300 group-hover:scale-110">
                    {SERVICE_ICONS[service.name] || '🧺'}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <p className="font-sans font-semibold text-neutral-800 group-hover:text-violet-600 transition-colors duration-200 text-sm text-center">
                  {service.name}
                </p>
                <p className="font-sans text-[10px] text-neutral-400 tracking-wide">
                  starts at
                </p>
                <p className="font-sans text-xs text-violet-500 font-bold tracking-wide">
                  ₱{service.price}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default SpecialityMenu