import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'

function Header() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
      className="overflow-hidden relative flex flex-col bg-white"
    >
      <style>{`
        @keyframes floatImg {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #1e3a8a 0%,
            #2563eb 30%,
            #93c5fd 50%,
            #2563eb 70%,
            #1e3a8a 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .reveal-1 { animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .reveal-2 { animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .reveal-3 { animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .reveal-4 { animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .reveal-5 { animation: slideUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.7s both; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-6 md:px-16 py-3 border-b border-blue-100 relative z-20 bg-white">
        <span className="uppercase tracking-[0.2em] md:tracking-[0.35em] text-[8px] md:text-[11px] text-blue-400 font-sans font-bold">
          Selfie Wash Laundry
        </span>
        <span className="uppercase tracking-[0.2em] md:tracking-[0.35em] text-[8px] md:text-[11px] text-blue-400 font-sans font-bold sm:block">
          Pickup · Wash · Deliver
        </span>
      </div>

      {/* ── HERO BODY ── */}
      <div className="relative flex flex-row items-center overflow-hidden min-h-[60vh] md:min-h-[88vh]">

        {/* ── BACKGROUND BLUE PANEL (Hidden on Mobile) ── */}
        <div
          className="hidden md:block absolute top-0 right-0 h-full bg-blue-600 z-0"
          style={{ width: '35%' }}
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_top,white,transparent)]" />
        </div>

        {/* Ghost SW */}
        <span
          className="absolute left-[-0%] top-[10%] select-none pointer-events-none leading-none opacity-20 md:opacity-60"
          style={{
            fontSize: 'clamp(120px, 25vw, 260px)',
            fontWeight: 800,
            color: '#dbeafe',
            zIndex: 1,
          }}
        >
          SW
        </span>

        {/* ── LEFT SIDE (TEXT) ── */}
        <div className={`relative z-10 flex flex-col justify-center gap-4 md:gap-6 px-6 md:pl-16 md:pr-0 w-full md:w-[60%] ${loaded ? '' : 'invisible'}`}>

          {/* Headline */}
          <div className="reveal-1">
            <h1
              className="leading-[0.95] text-blue-900"
              style={{
                fontSize: 'clamp(40px, 12vw, 82px)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Fresh<br />
              <span className="shimmer-text">Clothes.</span><br />
              Zero<br />
              Hassle.
            </h1>
          </div>

          {/* Subtext */}
          <p className="reveal-2 text-sm md:text-base max-w-[220px] md:max-w-sm leading-snug font-sans font-semi-bold text-blue-700">
            We pick up, wash, fold, and deliver straight to your doorstep.
          </p>
          
          {/* CTA */}
          <div className="reveal-4 mt-2">
            <a
              href="#speciality"
  className="group relative overflow-hidden bg-orange-500 text-white px-6 md:px-8 py-3 md:py-3.5 font-sans text-[10px] md:text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2"
  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
>
  <span className="relative z-10">Book Now</span>
  <img src={assets.arrow_icon} className="w-2 md:w-3 invert" alt="" />
  <div className="absolute inset-0 bg-orange-600 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
</a>
          </div>
        </div>

        {/* ── RIGHT SIDE (IMAGE) (Hidden on Mobile) ── */}
        <div className="hidden md:flex relative z-10 w-[40%] h-full items-end justify-center pr-2 md:pr-0">
          <img
            src={assets.header_img}
            alt="Mascot"
            className="reveal-5 w-full h-auto max-h-[300px] md:max-h-none object-contain object-bottom"
            style={{
              animation: 'floatImg 3s ease-in-out infinite',
            }}
          />
        </div>
      </div>

    </div>
  )
}

export default Header