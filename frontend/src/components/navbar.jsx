import { assets } from '../assets/assets'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import React, { useState, useEffect, useRef, useContext } from 'react'
import { AppContext } from '../context/AppContext'

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, userData, logoutUser, branches } = useContext(AppContext)

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [showBranchMenu, setShowBranchMenu] = useState(false)
  const [isScrolled, setIsScrolled]         = useState(false)
  const [showTicker, setShowTicker]         = useState(true)

  const dropdownRef   = useRef(null)
  const branchMenuRef = useRef(null)
  const branchTimeout = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setIsScrolled(currentY > 10)
      setShowTicker(currentY < 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleBranchMouseEnter = () => {
    clearTimeout(branchTimeout.current)
    setShowBranchMenu(true)
  }

  const handleBranchMouseLeave = () => {
    branchTimeout.current = setTimeout(() => setShowBranchMenu(false), 150)
  }

  const logout = async () => {
    setShowDropdown(false)
    await logoutUser()
    navigate('/')
  }

  const scrollToSection = (id) => {
    setShowMobileMenu(false)
    if (location.pathname === '/') {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 400)
    }
  }

  const navLinkClass = (isActive) =>
    `font-sans text-[11px] tracking-[0.25em] uppercase font-bold transition-all duration-300 pb-1 ${
      isActive
        ? 'text-violet-600 border-b-2 border-violet-600'
        : 'text-neutral-500 hover:text-violet-600 border-b-2 border-transparent'
    }`

  const scrollLinkClass =
    'font-sans text-[11px] tracking-[0.25em] uppercase font-bold transition-all duration-300 pb-1 text-neutral-500 hover:text-violet-600 border-b-2 border-transparent cursor-pointer'

  return (
    <header className="w-full">
      {/* ── NEWS TICKER ── */}
      <div
        className={`fixed top-0 left-0 right-0 z-[110] bg-violet-900 text-white py-2 overflow-hidden border-b border-violet-800 transition-all duration-500 ease-in-out ${
          showTicker ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="flex whitespace-nowrap animate-marquee">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className="mx-10 font-sans text-[10px] uppercase tracking-[0.3em] font-bold flex items-center gap-4">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              Laundry Online Appointment is now available
              <span className="opacity-50">— Book your slot today</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── STICKY NAVBAR ── */}
      <nav
        className={`fixed left-0 right-0 z-[100] transition-all duration-500 ease-in-out border-b ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md border-violet-100 py-3 shadow-md'
            : 'bg-white border-transparent py-5'
        }`}
        style={{
          top: showTicker ? '34px' : '0px',
          fontFamily: "'Georgia', serif"
        }}
      >
        <div className='flex items-center justify-between px-6 md:px-10 w-full'>

          {/* LEFT: Logo */}
          <div className="flex-1 flex justify-start">
            <img
              className='w-10 cursor-pointer hover:scale-105 transition-transform'
              src={assets.logo}
              alt='Selfie Wash'
              onClick={() => { navigate('/'); window.scrollTo(0, 0) }}
            />
          </div>

          {/* CENTER: Nav Links */}
          <ul className='hidden md:flex items-center gap-8 lg:gap-12'>
            <NavLink to='/' className={({ isActive }) => navLinkClass(isActive)}>Home</NavLink>

            {/* Branch Dropdown */}
            <li
              ref={branchMenuRef}
              className='relative list-none flex items-center'
              onMouseEnter={handleBranchMouseEnter}
              onMouseLeave={handleBranchMouseLeave}
            >
              <button onClick={() => navigate('/branches')} className={navLinkClass(location.pathname === '/branches')}>
                Our Branches
              </button>

              {showBranchMenu && branches?.length > 0 && (
                <div className='absolute top-full left-1/2 -translate-x-1/2 w-80 pt-4'>
                  <div className='bg-white border border-violet-100 shadow-2xl overflow-hidden'
                       style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)' }}>
                    <div className='h-1 w-full bg-violet-600' />
                    <div className='max-h-72 overflow-y-auto'>
                      {branches.map((branch) => (
                        <div key={branch._id}
                             onClick={() => { navigate(`/appointment/${branch._id}`); window.scrollTo(0, 0); setShowBranchMenu(false) }}
                             className='group flex items-center gap-3 px-4 py-4 hover:bg-violet-50 cursor-pointer transition-all border-b border-violet-50/60 last:border-0'>
                          <span className={`w-1.5 h-1.5 rounded-full ${branch.available ? 'bg-green-500 animate-pulse' : 'bg-red-300'}`} />
                          <p className='font-sans text-xs font-bold text-neutral-700 group-hover:text-violet-700 transition-colors uppercase tracking-wider flex-1 truncate'>{branch.name}</p>
                          <span className='text-violet-200 group-hover:text-violet-500'>→</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>

            {/* FAQs — smooth scroll to #faqs on homepage */}
            <li className='list-none flex items-center'>
              <span onClick={() => scrollToSection('faqs')} className={scrollLinkClass}>
                FAQs
              </span>
            </li>

            <NavLink to='/about'   className={({ isActive }) => navLinkClass(isActive)}>About</NavLink>
            <NavLink to='/contact' className={({ isActive }) => navLinkClass(isActive)}>Contact</NavLink>
          </ul>

          {/* RIGHT: User / Sign In */}
          <div className='flex-1 flex justify-end items-center gap-5'>
            {token ? (
              <div ref={dropdownRef} className='relative flex items-center gap-3 group'>
                <div className='flex items-center gap-2 cursor-pointer' onClick={() => setShowDropdown(!showDropdown)}>
                  <img className='w-9 h-9 rounded-full object-cover ring-2 ring-violet-100 group-hover:ring-violet-400 transition-all' src={userData?.image || assets.upload_icon} alt='' />
                  <img className={`w-2 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} src={assets.dropdown_icon} alt='' />
                </div>
                {showDropdown && (
                  <div className='absolute top-full right-0 mt-4 w-52 bg-white border border-violet-100 shadow-2xl z-50 py-1'
                       style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)' }}>
                    <p onClick={() => { navigate('/my-profile'); setShowDropdown(false) }} className='px-5 py-3 font-sans text-xs uppercase tracking-widest text-neutral-600 hover:bg-violet-50 hover:text-violet-700 cursor-pointer transition-colors font-bold'>Profile</p>
                    <p onClick={() => { navigate('/my-appointments'); setShowDropdown(false) }} className='px-5 py-3 font-sans text-xs uppercase tracking-widest text-neutral-600 hover:bg-violet-50 hover:text-violet-700 cursor-pointer transition-colors font-bold'>Appointments</p>
                    <div className='border-t border-violet-50' />
                    <p onClick={logout} className='px-5 py-3 font-sans text-xs uppercase tracking-widest text-red-400 hover:bg-red-50 hover:text-red-500 cursor-pointer transition-colors font-bold'>Logout</p>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate('/login')} className='bg-violet-600 text-white px-7 py-3 font-sans text-[10px] tracking-[0.2em] uppercase font-bold transition-colors hover:bg-violet-700'
                      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 15px, 100% 100%, 0 100%)' }}>
                Sign In
              </button>
            )}
            <img onClick={() => setShowMobileMenu(true)} className='w-6 md:hidden cursor-pointer opacity-70 hover:opacity-100' src={assets.menu_icon} alt='' />
          </div>
        </div>
      </nav>

      <div className="h-[104px]" />

      {/* MOBILE MENU */}
      <div className={`fixed inset-0 z-[200] bg-white transition-all duration-500 ease-in-out md:hidden ${showMobileMenu ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className='flex items-center justify-between px-6 py-6 border-b border-violet-100'>
          <img className='w-10' src={assets.logo} alt='' />
          <img className='w-7 cursor-pointer' onClick={() => setShowMobileMenu(false)} src={assets.cross_icon} alt='' />
        </div>
        <ul className='flex flex-col mt-10 px-8 gap-6'>
          {['Home', 'Branches', 'About', 'Contact'].map((label) => (
            <NavLink key={label} to={label === 'Home' ? '/' : `/${label.toLowerCase()}`} onClick={() => setShowMobileMenu(false)}
                     className={({ isActive }) => `text-2xl font-sans uppercase tracking-[0.2em] font-bold ${isActive ? 'text-violet-600' : 'text-neutral-400'}`}>
              {label}
            </NavLink>
          ))}
          <span onClick={() => scrollToSection('faqs')} className='text-2xl font-sans uppercase tracking-[0.2em] font-bold text-neutral-400 cursor-pointer'>
            FAQs
          </span>
        </ul>
      </div>
    </header>
  )
}

export default Navbar