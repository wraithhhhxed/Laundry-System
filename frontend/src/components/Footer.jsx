import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const Footer = () => {
  const navigate = useNavigate()

  // Reusable style para sa links para kamukha ng Navbar
  const footerLinkClass = "font-sans text-[11px] tracking-[0.25em] uppercase font-bold text-neutral-500 hover:text-violet-600 cursor-pointer transition-all duration-300"

  return (
    <div
      className="bg-white px-6 md:px-16 pt-16 pb-0 border-t border-violet-100"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.2fr_1.2fr] gap-12 pb-14 border-b border-violet-100">

        {/* Brand Section */}
        <div className="flex flex-col gap-6">
          <img
            src={assets.logo}
            alt="Selfie Wash"
            className="w-10 cursor-pointer opacity-90 hover:scale-110 transition-transform"
            onClick={() => { navigate('/'); window.scrollTo(0,0) }}
          />
          <p className="text-neutral-500 font-sans text-xs leading-relaxed max-w-xs font-medium tracking-wide">
            Your trusted partner for fresh, clean laundry. We pick up, wash, and deliver right to your door.
          </p>
          
          <div className="flex gap-3 mt-2">
            {[
              { label: 'f',  href: 'https://facebook.com' },
              { label: 'ig', href: 'https://instagram.com' },
              { label: 'x',  href: 'https://twitter.com' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center border border-violet-100 text-neutral-400 hover:border-violet-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-300 font-sans text-[10px] font-black uppercase"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Company Links */}
        <div className="flex flex-col gap-6">
          <span className="uppercase tracking-[0.3em] text-[10px] text-violet-400 font-sans font-black">
            Company
          </span>
          <ul className="flex flex-col gap-4">
            {[
              { label: 'Home',         path: '/' },
              { label: 'About Us',     path: '/about' },
              { label: 'Contact',      path: '/contact' },
              { label: 'All Branches', path: '/branches' },
            ].map(({ label, path }) => (
              <li
                key={label}
                onClick={() => { navigate(path); window.scrollTo(0,0) }}
                className={footerLinkClass}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Section */}
        <div className="flex flex-col gap-6">
          <span className="uppercase tracking-[0.3em] text-[10px] text-violet-400 font-sans font-black">
            Get In Touch
          </span>
          <ul className="flex flex-col gap-5">
            <li className="flex flex-col gap-1">
              <span className="font-sans text-[9px] uppercase text-neutral-300 font-bold tracking-[0.2em]">Phone</span>
              <span className="font-sans text-[11px] tracking-[0.1em] text-neutral-600 font-bold uppercase">+63 111 111 1111</span>
            </li>
            <li className="flex flex-col gap-1">
              <span className="font-sans text-[9px] uppercase text-neutral-300 font-bold tracking-[0.2em]">Email</span>
              <span className="font-sans text-[11px] tracking-[0.1em] text-neutral-600 font-bold uppercase">SelfieWash@gmail.com</span>
            </li>
          </ul>
        </div>

      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-8 gap-4">
        <p className="font-sans text-[9px] text-neutral-400 uppercase tracking-[0.25em] font-bold">
          © 2026 <span className="text-violet-500">Selfie Wash</span>. All rights reserved
          <span onClick={() => navigate('/secret-login')} className="opacity-0 cursor-default">.</span>
        </p>
        
        <div className="flex gap-6">
          <span className="font-sans text-[9px] text-neutral-400 uppercase tracking-[0.2em] font-bold cursor-pointer hover:text-violet-600 transition-colors">Privacy</span>
          <span className="font-sans text-[9px] text-neutral-400 uppercase tracking-[0.2em] font-bold cursor-pointer hover:text-violet-600 transition-colors">Terms</span>
        </div>
      </div>
    </div>
  )
}

export default Footer