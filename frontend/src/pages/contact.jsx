import React from 'react'
import { assets } from '../assets/assets'

const Contact = () => {
  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="bg-white">

      {/* ── HEADING ── */}
      <div className="px-6 md:px-16 pt-14 pb-0">
        <div className="flex items-end justify-between mb-3">
          <span className="uppercase tracking-[0.35em] text-[10px] font-bold text-blue-400 font-sans">
            Get In Touch
          </span>
        </div>
        <div className="h-px bg-blue-100 mb-10" />
        <h1
          className="leading-none text-blue-900 mb-16"
          style={{
            fontSize: 'clamp(48px, 8vw, 110px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
          }}
        >
          Contact Us.
        </h1>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-6 md:px-16 mb-20">
        <div className="flex flex-col md:flex-row gap-0 items-stretch">

          {/* image */}
          <div className="w-full md:w-1/2 overflow-hidden">
            <img
              src={assets.contact_image}
              alt="Contact Us"
              className="w-full h-full object-cover"
              style={{ maxHeight: '480px' }}
            />
          </div>

          {/* info panel */}
          <div className="flex-1 border border-blue-100 px-8 md:px-12 py-10 flex flex-col gap-8">

            <div>
              <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-2">
                Our Main Branch
              </span>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                Barangay San Miguel<br />
                Taguig City, Metro Manila
              </p>
            </div>

            <div>
              <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-2">
                Contact Information
              </span>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                Tel: +63 9295645494<br />
                Email: customercare@biowashlaundry.com
              </p>
            </div>

            <div className="h-px bg-blue-100" />

            <div>
              <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-2">
                We're Also Hiring!
              </span>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed mb-6">
                Join our team and help us deliver exceptional laundry services to our valued customers.
              </p>
              <button
                className="group relative overflow-hidden bg-blue-600 text-white px-10 py-4 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3"
                style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
              >
                <span className="relative z-10">Apply Now</span>
                <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
                <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}

export default Contact