import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'

const Footer = () => {
  const navigate = useNavigate()

  // Reusable style para sa links with Inter font - 5% smaller
  const footerLinkClass = "font-inter text-[11.4px] tracking-[0.2em] uppercase font-bold text-neutral-700 hover:text-blue-600 cursor-pointer transition-all duration-300"

  return (
    <div
      className="bg-white px-6 md:px-16 pt-8 pb-0 border-t border-blue-100" // binawasan pt-16 to pt-8
    >
      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.2fr_1.2fr] gap-8 pb-8 border-b border-blue-100"> {/* binawasan gap-12 to gap-8 at pb-14 to pb-8 */}

        {/* Brand Section */}
        <div className="flex flex-col gap-4"> {/* binawasan gap-6 to gap-4 */}
          <img
            src={assets.logo}
            alt="Selfie Wash"
            className="w-11 cursor-pointer opacity-90 hover:scale-110 transition-transform"
            onClick={() => { navigate('/'); window.scrollTo(0,0) }}
          />
          <p className="text-neutral-600 font-inter text-[13.65px] leading-relaxed max-w-xs font-medium tracking-wide">
            Your trusted partner for fresh, clean laundry. We pick up, wash, and deliver right to your door.
          </p>
        </div>

        {/* Company Links */}
        <div className="flex flex-col gap-4"> {/* binawasan gap-6 to gap-4 */}
          <span className="uppercase tracking-[0.25em] text-[10.45px] text-blue-400 font-inter font-black">
            Company
          </span>
          <ul className="flex flex-col gap-3"> {/* binawasan gap-4 to gap-3 */}
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
        <div className="flex flex-col gap-4"> {/* binawasan gap-6 to gap-4 */}
          <span className="uppercase tracking-[0.25em] text-[10.45px] text-blue-400 font-inter font-black">
            Get In Touch
          </span>
          <ul className="flex flex-col gap-3"> {/* binawasan gap-5 to gap-3 */}
            <li className="flex flex-col gap-0.5"> {/* binawasan gap-1 to gap-0.5 */}
              <span className="font-inter text-[9.5px] uppercase text-neutral-500 font-bold tracking-[0.2em]">Phone</span>
              <span className="font-inter text-[12.35px] tracking-[0.05em] text-neutral-800 font-bold uppercase hover:text-blue-600 transition-colors duration-300 cursor-pointer">
                0929-5645494
              </span>
            </li>
            <li className="flex flex-col gap-0.5"> {/* binawasan gap-1 to gap-0.5 */}
              <span className="font-inter text-[9.5px] uppercase text-neutral-500 font-bold tracking-[0.2em]">Email</span>
              <span className="font-inter text-[11.4px] tracking-[0.05em] text-neutral-800 font-bold uppercase hover:text-blue-600 transition-colors duration-300 cursor-pointer">
                customercare@biowashlaundry.com
              </span>
            </li>
            <li className="flex flex-col gap-0.5"> {/* binawasan gap-1 to gap-0.5 */}
              <span className="font-inter text-[9.5px] uppercase text-neutral-500 font-bold tracking-[0.2em]">Facebook</span>
              <a 
                href="https://www.facebook.com/biowashlaundryhubph"
                target="_blank"
                rel="noopener noreferrer"
                className="font-inter text-[12.35px] tracking-[0.05em] text-neutral-800 hover:text-blue-600 font-bold uppercase transition-colors duration-300"
              >
                BioWash Laundry Hub PH
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-3"> {/* binawasan py-8 to py-4 at gap-4 to gap-3 */}
        <p className="font-inter text-[9.5px] text-neutral-500 uppercase tracking-[0.2em] font-bold">
          © 2026 <span className="text-blue-500">Selfie Wash</span>. All rights reserved
          <span onClick={() => navigate('/secret-login')} className="opacity-0 cursor-default">.</span>
        </p>
        
        <div className="flex gap-4"> {/* binawasan gap-6 to gap-4 */}
          <span className="font-inter text-[9.5px] text-neutral-500 uppercase tracking-[0.2em] font-bold cursor-pointer hover:text-blue-600 transition-colors">Privacy</span>
          <span className="font-inter text-[9.5px] text-neutral-500 uppercase tracking-[0.2em] font-bold cursor-pointer hover:text-blue-600 transition-colors">Terms</span>
        </div>
      </div>
    </div>
  )
}

export default Footer