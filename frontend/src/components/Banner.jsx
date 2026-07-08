import React from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

const Banner = () => {
  const navigate = useNavigate()

  return (
    <div
      className="relative overflow-hidden bg-violet-600 px-6 md:px-16 my-20"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* glow from top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '70%',
          height: '60%',
          background: 'radial-gradient(ellipse at top, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)',
        }}
      />

      {/* bottom vignette */}
      <div
        className="absolute bottom-0 left-0 w-full pointer-events-none"
        style={{
          height: '40%',
          background: 'linear-gradient(to top, rgba(91,33,182,0.5) 0%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-0">

        {/* ── LEFT ── */}
        <div className="flex-1 flex flex-col gap-7 py-14">
          <div className="flex flex-col gap-1">
            <span className="uppercase tracking-[0.35em] text-[10px] text-white/50 font-sans">
              Get Started Today
            </span>
            <h2
              className="leading-none text-white"
              style={{
                fontSize: 'clamp(36px, 6vw, 80px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
              }}
            >
              Book Now.
            </h2>
            <p className="text-white/60 font-sans text-base md:text-lg mt-2 max-w-xs leading-relaxed font-normal">
              With your trusted laundry service — fresh clothes, zero hassle.
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                navigate('/login', { state: { tab: 'register' } })
                window.scrollTo(0, 0)
              }}
              className="group relative overflow-hidden bg-white text-violet-700 px-10 py-4 font-sans text-sm tracking-widest uppercase font-bold inline-flex items-center gap-3"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
            >
              <span className="relative z-10">Create Account</span>
              <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
              <div className="absolute inset-0 bg-violet-100 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            </button>
          </div>
        </div>

        {/* ── RIGHT: framed image ── */}
        <div className="flex-1 flex items-center justify-center py-10 md:py-8">
          <div className="relative">

            {/* decorative offset border frame */}
            <div
              className="absolute rounded-2xl border-2 border-white/20"
              style={{ inset: '-10px 10px 10px -10px' }}
            />

            {/* decorative dot accent */}
            <div
              className="absolute -top-4 -left-4 w-16 h-16 rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            />
            <div
              className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />

            {/* actual image */}
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                boxShadow: '0 25px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                maxWidth: 'clamp(260px, 35vw, 440px)',
              }}
            >
              <img
                src={assets.appointment_img}
                alt="Book appointment"
                className="w-full object-cover block"
                style={{ aspectRatio: '4/3' }}
              />
              {/* subtle inner top shine */}
              <div
                className="absolute top-0 left-0 w-full pointer-events-none"
                style={{
                  height: '40%',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)',
                }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Banner