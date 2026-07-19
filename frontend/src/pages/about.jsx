import React, { useEffect, useRef, useState, useMemo } from 'react'
import { assets } from '../assets/assets'

// --- CONSTANTS ---
const PARA1 = "At Selfie Wash, we understand the importance of clean clothes and the value of your time. Our mission is to provide a hassle-free laundry experience that exceeds your expectations."
const PARA2 = "With our state-of-the-art facilities and eco-friendly practices, we ensure that your garments are treated with the utmost care and attention. Whether you need a quick wash or a deep clean, our team of experts is here to serve you with a smile."

const COMMITMENT_CARDS = [
  { num: '01', title: 'Efficiency',      desc: 'Fast turnaround time with same-day service options to fit your busy schedule.' },
  { num: '02', title: 'Convenience',     desc: 'Easy pickup and delivery service right to your doorstep, making laundry effortless.' },
  { num: '03', title: 'Personalization', desc: 'Customized care for each garment type with special treatment options available.' },
]

// --- HOOKS ---
function useScrollProgress(ref, startFactor = 0.8, endFactor = 0.2) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (ref.current) {
            const rect    = ref.current.getBoundingClientRect()
            const windowH = window.innerHeight
            const start   = windowH * startFactor
            const end     = windowH * endFactor
            const raw     = (start - rect.top) / (start - end)
            setProgress(Math.min(1, Math.max(0, raw)))
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [ref, startFactor, endFactor])

  return progress
}

// --- COMPONENTS ---
const KaraokeText = React.memo(({ text, progress, startFrac = 0, endFrac = 1, baseColor, litColor }) => {
  const words = useMemo(() => text.split(' '), [text])
  const totalChars = text.length
  let charCount = 0

  return (
    <>
      {words.map((word, i) => {
        const wordStartFrac = startFrac + (charCount / totalChars) * (endFrac - startFrac)
        charCount += word.length + 1
        const isLit = progress >= wordStartFrac

        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: isLit ? litColor : baseColor,
                transition: 'color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'color',
                display: 'inline-block',
              }}
            >
              {word}
            </span>
            {i !== words.length - 1 && ' '}
          </React.Fragment>
        )
      })}
    </>
  )
})

// Eyebrow label with staggered word reveal — matches FeaturedBranches pattern
const EyebrowLabel = ({ text, progress, threshold = 0.1, color = '#60a5fa' }) => {
  const words = useMemo(() => text.split(' '), [text])
  return (
    <div className="flex items-center gap-1 font-sans">
      {words.map((word, i) => (
        <span
          key={i}
          className="uppercase tracking-[0.35em] text-[10px] font-bold"
          style={{
            color: progress >= threshold + (i * 0.05) ? color : '#e5e5e5',
            transition: 'color 0.25s ease-out',
          }}
        >
          {word}{'\u00A0'}
        </span>
      ))}
    </div>
  )
}

const About = () => {
  const storyRef    = useRef(null)
  const commitRef   = useRef(null)
  const findUsRef   = useRef(null)
  // Separate refs for eyebrow rows so they get their own scroll progress
  const eyebrow1Ref = useRef(null)
  const eyebrow2Ref = useRef(null)
  const eyebrow3Ref = useRef(null)

  const storyProgress    = useScrollProgress(storyRef,    0.5,  0.0)
  const commitProgress   = useScrollProgress(commitRef,   0.95, 0.1)
  const findUsProgress   = useScrollProgress(findUsRef,   0.9,  0.4)
  const eyebrow1Progress = useScrollProgress(eyebrow1Ref, 1.0,  0.20)
  const eyebrow2Progress = useScrollProgress(eyebrow2Ref, 1.0,  0.20)
  const eyebrow3Progress = useScrollProgress(eyebrow3Ref, 1.0,  0.20)

  const effectiveCommitProgress = commitProgress
  const [hoveredCard, setHoveredCard] = useState(null)

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="bg-white overflow-x-hidden">

      {/* ── HERO HEADING ── */}
      <div className="px-6 md:px-16 pt-14 pb-0">
        <div className="flex items-end justify-between mb-3">
          <span className="uppercase tracking-[0.35em] text-[10px] font-bold text-blue-400 font-sans">
            Who We Are
          </span>
        </div>
        <div className="h-px bg-blue-100 mb-10" />
        <h1
          className="leading-none text-blue-900 mb-16"
          style={{ fontSize: 'clamp(48px, 8vw, 110px)', fontWeight: 700, letterSpacing: '-0.03em' }}
        >
          About Us.
        </h1>
      </div>

      {/* ── ABOUT IMAGE + TEXT ── */}
      <div className="px-6 md:px-16 mb-20">
        <div className="flex flex-col md:flex-row gap-0 items-stretch">
          <div className="w-full md:w-1/2 overflow-hidden">
            <img
              src={assets.about_image}
              alt="About Us"
              className="w-full h-full object-cover"
              style={{ maxHeight: '420px' }}
            />
          </div>
          <div
            ref={storyRef}
            className="flex-1 bg-blue-600 px-8 md:px-12 py-10 flex flex-col justify-center gap-6 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
            />
            <span className="uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans relative z-10">
              Our Story
            </span>

            <div className="font-sans text-sm md:text-base leading-relaxed relative z-10 flex flex-col gap-4">
              <p>
                <KaraokeText
                  text={PARA1}
                  progress={storyProgress}
                  startFrac={0.1} endFrac={0.5}
                  baseColor="rgba(255,255,255,0.2)"
                  litColor="rgba(255,255,255,0.95)"
                />
              </p>
              <p className="text-sm">
                <KaraokeText
                  text={PARA2}
                  progress={storyProgress}
                  startFrac={0.5} endFrac={0.9}
                  baseColor="rgba(255,255,255,0.15)"
                  litColor="rgba(255,255,255,0.75)"
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHY CHOOSE US ── */}
      <div className="px-6 md:px-16 mb-20">
        <div ref={eyebrow2Ref} className="flex items-end justify-between mb-3">
          <EyebrowLabel text="Why Choose Us" progress={eyebrow2Progress} color="#60a5fa" />
        </div>
        <div className="h-px bg-blue-100 mb-10" />

        <div ref={commitRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <h2
            className="leading-none text-blue-900"
            style={{ fontSize: 'clamp(32px, 5vw, 70px)', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            <KaraokeText
              text="Our Commitment."
              progress={effectiveCommitProgress}
              startFrac={0.10} endFrac={0.30}
              baseColor="#e5e5e5" litColor="#1e3a8a"
            />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-blue-100 border-x border-blue-100">
          {COMMITMENT_CARDS.map(({ num, title, desc }, ci) => {
            const cardStart = 0.30 + ci * 0.20
            const cardEnd   = cardStart + 0.15
            return (
              <div
                key={title}
                className="group bg-white hover:bg-blue-600 transition-colors duration-300 px-8 py-10 flex flex-col gap-4 cursor-pointer"
                onMouseEnter={() => setHoveredCard(ci)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <span
                  className="font-sans font-bold leading-none transition-colors duration-300 group-hover:text-white/20"
                  style={{
                    fontSize: 'clamp(36px, 4vw, 56px)',
                    color: effectiveCommitProgress >= cardStart ? '#93c5fd' : '#f5f5f5',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {num}
                </span>
                <h3
                  className="font-bold leading-none transition-colors duration-300 group-hover:text-white"
                  style={{
                    fontSize: 'clamp(18px, 2vw, 24px)',
                    letterSpacing: '-0.02em',
                    color: effectiveCommitProgress >= cardStart + 0.05 ? '#172554' : '#e5e5e5',
                    transition: 'color 0.3s ease',
                  }}
                >
                  {title}
                </h3>
                <p className="font-sans text-sm leading-relaxed transition-colors duration-300">
                  <KaraokeText
                    text={desc}
                    progress={effectiveCommitProgress}
                    startFrac={cardStart + 0.06} endFrac={cardEnd}
                    baseColor={hoveredCard === ci ? 'rgba(255,255,255,0.5)' : '#f5f5f5'}
                    litColor={hoveredCard === ci ? 'rgba(255,255,255,0.85)' : '#737373'}
                  />
                </p>
                <span
                  className="mt-auto font-sans text-xs uppercase tracking-widest transition-colors duration-300 group-hover:text-white/50"
                  style={{
                    color: effectiveCommitProgress >= cardEnd ? '#60a5fa' : '#f5f5f5',
                    transition: 'color 0.3s ease',
                  }}
                >
                  Learn more →
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FIND US ── */}
      <div className="px-6 md:px-16 mb-20">
        <div ref={eyebrow3Ref} className="flex items-end justify-between mb-3">
          <EyebrowLabel text="Location" progress={eyebrow3Progress} color="#60a5fa" />
        </div>
        <div className="h-px bg-blue-100 mb-10" />

        <div ref={findUsRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <h2
            className="leading-none text-blue-900"
            style={{ fontSize: 'clamp(32px, 5vw, 70px)', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            <KaraokeText
              text="Find Us."
              progress={findUsProgress}
              startFrac={0.10} endFrac={0.40}
              baseColor="#e5e5e5" litColor="#1e3a8a"
            />
          </h2>
          <div className="max-w-xs md:text-right">
            <p className="font-sans text-sm leading-relaxed">
              <KaraokeText
                text="Visit us at our main branch or get in touch anytime."
                progress={findUsProgress}
                startFrac={0.40} endFrac={0.80}
                baseColor="#e5e5e5" litColor="#737373"
              />
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-stretch">
          <div
            className="w-full md:w-2/3 overflow-hidden border border-blue-100 grayscale hover:grayscale-0 transition-all duration-700"
            style={{ minHeight: '380px' }}
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d965.6119176905767!2d121.07219700000002!3d14.516367000000002!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c8ac92d3eedd%3A0xa93c6d0dd27a84bc!2s56%2C%20G38C%2BHW6%2C%201632%20M.%20L.%20Quezon%20Avenue%2C%20Taguig%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1773770550590!5m2!1sen!2sph"
              width="100%" height="100%"
              style={{ border: 0, display: 'block', minHeight: '380px' }}
              allowFullScreen="" loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Selfie Wash Main Branch Location"
            />
          </div>
          <div className="flex-1 font-bold bg-white border border-blue-100 px-8 py-10 flex flex-col gap-7">
            {[
              { label: 'Our Main Branch', content: <>Barangay San Miguel<br />Taguig City, Metro Manila</> },
              { label: 'Hours',           content: <>Open 7 Days a Week<br />8:00 AM – 4:00 PM</> },
              { label: 'Contact',         content: <>Tel: +63 111 111 1111<br />selfiewash@gmail.com</> },
            ].map(({ label, content }) => (
              <div key={label}>
                <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-2">{label}</span>
                <p className="font-sans text-sm text-neutral-600 leading-relaxed">{content}</p>
              </div>
            ))}
            <div className="h-px bg-blue-100" />
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=14.516367,121.072197"
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden bg-blue-600 text-white px-8 py-3.5 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3 mt-auto w-fit"
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              <span className="relative z-10">Get Directions</span>
              <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
              <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            </a>
          </div>
        </div>
      </div>

    </div>
  )
}

export default About