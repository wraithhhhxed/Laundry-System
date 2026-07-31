import React, { useEffect, useRef, useState } from 'react'
import { assets } from '../assets/assets'

// --- CONSTANTS ---
const STORY_PARA1 = "Selfie Wash Laundry began in Pasay in 2010, founded by a couple who worked as property managers in their building. Their journey started with a simple observation: residents frequently complained about the unreliable laundry shop on the premises and turned to them for help. When the laundry shop closed in 2009, they saw an opportunity to provide the dependable service the community needed."

const STORY_PARA2 = "Eager to deliver quality care, they studied and trained in laundry operations and fabric care. Their first traditional full-service laundry shop opened in 2010. By 2015, they embraced innovation, pivoting to a self-service model. In 2020, Selfie Wash evolved into a hybrid laundry model, blending full and self-service options for ultimate convenience."

const STORY_PARA3 = "In 2024, the wife-owner pursued a Master's in Entrepreneurship at the Asian Institute of Management, making Selfie Wash her capstone project. Today, they remain committed to growth and excellence, striving to become the fastest-growing and most reliable laundry chain in the Philippines."

const MISSION_TEXT = "Simplify lives and empower our customers by providing ultimate laundry convenience, and meticulous attention to detail, while delivering unparalleled value and innovation in laundry care."

const VISION_TEXT = "Become the trusted leader and foremost authority in laundry and fabric care, recognized for our relentless commitment to customer empowerment, excellence, and pioneering new solutions that enhance everyday life."

// --- BRANCH DATA ---
const BRANCHES = [
  {
    id: 'hagonoy',
    name: 'Hagonoy',
    address: '52 ML Quezon St., Hagonoy, Taguig',
    lat: 14.516367,
    lng: 121.072197,
  },
  {
    id: 'lower-bicutan-1',
    name: 'Lower Bicutan 1',
    address: '414 ML Quezon St., Purok 5, Lower Bicutan, Taguig',
    lat: 14.490070,
    lng: 121.060427,
  },
  {
    id: 'lower-bicutan-2',
    name: 'Lower Bicutan 2',
    address: '54 ML Quezon St., Purok 1, New Lower Bicutan, Taguig',
    lat: 14.506604,
    lng: 121.065783,
  },
  {
    id: 'hagonoy-2',
    name: 'Hagonoy 2',
    address: '283 Magsaysay St, New Lower Bicutan, Taguig',
    lat: 14.505140,
    lng: 121.060544,
  },
  {
    id: 'ususan',
    name: 'Ususan',
    address: 'C5 Service Road, Ususan, Taguig',
    lat: 14.532430,
    lng: 121.058023,
  },
  {
    id: 'western-bicutan',
    name: 'Western Bicutan',
    address: '3 Champaca St., Western Bicutan, Taguig',
    lat: 14.511585,
    lng: 121.034326,
  },
  {
    id: 'pinagsama',
    name: 'Pinagsama',
    address: 'Blk 22, Lot 20 AFP-PNP Village, Pinagsama, Taguig',
    lat: 14.518000,
    lng: 121.074000,
  },
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
const About = () => {
  const storyRef    = useRef(null)
  const commitRef   = useRef(null)
  const findUsRef   = useRef(null)
  const eyebrow1Ref = useRef(null)
  const eyebrow2Ref = useRef(null)
  const eyebrow3Ref = useRef(null)

  const [selectedBranch, setSelectedBranch] = useState(null)

  const handleBranchClick = (branch) => {
    setSelectedBranch(branch)
  }

  const handleBackClick = () => {
    setSelectedBranch(null)
  }

  const defaultBranch = BRANCHES.find(b => b.id === 'hagonoy') || BRANCHES[0]
  const mapBranch = selectedBranch || defaultBranch

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
            className="flex-1 bg-blue-600 px-8 md:px-12 py-10 flex flex-col justify-center gap-4 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
            />

            <span className="uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans relative z-10">
              About Selfie Wash
            </span>

            <div className="font-sans text-sm md:text-base leading-relaxed relative z-10 flex flex-col gap-3 text-white/90">
              <p>At Selfie Wash, laundry is our passion. We go beyond wash-dry-fold to offer complete laundry and fabric care, including full service, self-service, Eco-Safe Drycleaning, and Vapor-Ozone cleaning for delicate items like shoes and bags. Our meticulous attention to detail and tiered services fit every budget, making premium care accessible. With continuous innovation, we provide expert solutions while focusing on your convenience—so you can live worry-free.</p>
            </div>
          </div>
        </div>
      </div>

{/* ── OUR STORY ── */}
<div className="px-6 md:px-16 mb-20">
  <div ref={eyebrow1Ref} className="flex flex-col items-start mb-3">
    <div className="w-full h-px bg-blue-100 mb-2" />

    <h2
      className="leading-none text-blue-900"
      style={{ fontSize: 'clamp(32px, 5vw, 70px)', fontWeight: 700, letterSpacing: '-0.03em' }}
    >
      Our Story
    </h2>
  </div>

  <div ref={storyRef} className="max-w-4xl mx-auto">
    <p className="font-sans text-base md:text-lg leading-relaxed text-neutral-700 mb-6">
      {STORY_PARA1}
    </p>

    <p className="font-sans text-base md:text-lg leading-relaxed text-neutral-700 mb-6">
      {STORY_PARA2}
    </p>

    <p className="font-sans text-base md:text-lg leading-relaxed text-neutral-700">
      {STORY_PARA3}
    </p>
  </div>
</div>

      {/* ── MISSION & VISION ── */}
      <div className="px-6 md:px-16 mb-20">
        <div className="h-px bg-blue-100 mb-10" />

        <div ref={commitRef} className="flex flex-col md:flex-row gap-8 mb-12">
          <div className="flex-1">
            <h2
              className="leading-none text-blue-900 mb-4"
              style={{ fontSize: 'clamp(32px, 5vw, 70px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              Our Mission
            </h2>

            <p className="font-sans text-sm md:text-base leading-relaxed text-neutral-600">
              {MISSION_TEXT}
            </p>
          </div>

          <div className="flex-1">
            <h2
              className="leading-none text-blue-900 mb-4"
              style={{ fontSize: 'clamp(32px, 5vw, 70px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              Our Vision
            </h2>

            <p className="font-sans text-sm md:text-base leading-relaxed text-neutral-600">
              {VISION_TEXT}
            </p>
          </div>
        </div>
      </div>

      {/* ── FIND US ── */}
      <div className="px-6 md:px-16 mb-20">
        <div ref={eyebrow3Ref} className="flex items-end justify-between mb-3">
          <span className="uppercase tracking-[0.35em] text-[10px] font-bold text-blue-400 font-sans">
            Location
          </span>
        </div>

        <div className="h-px bg-blue-100 mb-10" />

        <div ref={findUsRef} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <h2
            className="leading-none text-blue-900"
            style={{ fontSize: 'clamp(32px, 5vw, 70px)', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            Find Us.
          </h2>

          <div className="max-w-xs md:text-right">
            <p className="font-sans text-sm leading-relaxed text-neutral-600">
              Visit us at any of our branches or get in touch anytime.
            </p>
          </div>
        </div>

        {/* ─── MAP + BRANCH LIST / DETAILS ─── */}
        <div className="flex flex-col md:flex-row gap-8 items-stretch">
          {/* Map - Left Side */}
          <div className="w-full md:w-2/3 overflow-hidden border border-blue-100 grayscale hover:grayscale-0 transition-all duration-700" style={{ minHeight: '480px' }}>
            <iframe
              src={`https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3861.000!2d${mapBranch.lng}!3d${mapBranch.lat}!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${mapBranch.lat}%2C${mapBranch.lng}!5e0!3m2!1sen!2sph!4v1773770550590!5m2!1sen!2sph`}
              width="100%"
              height="480"
              style={{ border: 0, display: 'block' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Selfie Wash - ${mapBranch.name}`}
            />
          </div>

          {/* Right Side - Branch List or Details */}
          <div className="flex-1 bg-white border border-blue-100 px-8 py-10 flex flex-col min-h-[480px]">
            {selectedBranch ? (
              // ─── BRANCH DETAILS VIEW ───
              <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handleBackClick}
                    className="group flex items-center gap-2 font-sans text-xs uppercase tracking-widest font-bold text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                    Back to branches
                  </button>
                </div>

                <div className="h-px bg-blue-100 mb-6" />

                <div className="flex-1 flex flex-col gap-5">
                  <div>
                    <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-1">
                      Branch
                    </span>

                    <h3 className="font-bold text-xl text-blue-900">
                      {selectedBranch.name}
                    </h3>
                  </div>

                  <div>
                    <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-1">Address</span>

                    <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                      {selectedBranch.address}
                    </p>
                  </div>

                  <div>
                    <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-1">Hours</span>

                    <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                      Open 7 Days a Week<br />8:00 AM – 4:00 PM
                    </p>
                  </div>

                  <div>
                    <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-1">Contact</span>

                    <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                      Tel: +63 9295645494<br />
                      customercare@biowashlaundry.com
                    </p>
                  </div>

                  <div className="h-px bg-blue-100" />

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.lat},${selectedBranch.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden bg-blue-600 text-white px-8 py-3.5 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3 w-fit"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                  >
                    <span className="relative z-10">Get Directions</span>
                    <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
                    <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  </a>
                </div>
              </>
            ) : (
              // ─── BRANCH LIST VIEW ───
              <>
                <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-bold mb-4">
                  Our Branches in Taguig
                </span>

                <div className="h-px bg-blue-100 mb-4" />
                
                <div className="flex-1 flex flex-col gap-1">
                  {BRANCHES.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchClick(branch)}
                      className="group flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-all duration-200 text-left border-l-2 border-transparent hover:border-l-2 hover:border-blue-400"
                    >
                      <span className="font-sans text-sm font-medium text-neutral-700 group-hover:text-blue-600 transition-colors">
                        {branch.name}
                      </span>

                      <span className="text-neutral-300 group-hover:text-blue-400 transition-colors text-xs">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default About