import React, { useState, useContext, useEffect, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { AdminContext } from '../context/AdminContext'
import { BranchesContext } from '../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { assets } from '../assets/assets'

const inputCls =
  'w-full px-0 py-3.5 border-b-2 border-slate-300 font-sans text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all duration-300 bg-transparent'

const PasswordInput = ({ value, onChange, className, required, placeholder }) => {
  const [show, setShow] = useState(false)
  return (
    <div className='relative'>
      <input
        className={className}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        style={{ paddingRight: '2.5rem' }}
      />
      <button
        type='button'
        onClick={() => setShow(s => !s)}
        className='absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none'
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
    </div>
  )
}

/* ===== Realistic Soap Bubble (ambient — drifts in place) ===== */
const Bubble = ({ size, top, left, right, duration, delay = 0, opacity = 1 }) => {
  return (
    <div
      className='absolute bubble-drift'
      style={{
        width: size,
        height: size,
        top, left, right,
        animationDuration: duration,
        animationDelay: delay,
        opacity,
      }}
    >
      <div
        className='w-full h-full rounded-full relative'
        style={{
          background:
            'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 8%, rgba(191,219,254,0.25) 28%, rgba(147,197,253,0.18) 55%, rgba(96,165,250,0.12) 80%, rgba(59,130,246,0.08) 100%)',
          boxShadow:
            'inset -8px -12px 22px rgba(59,130,246,0.18), inset 6px 8px 18px rgba(255,255,255,0.7), inset 0 0 0 1px rgba(255,255,255,0.45), 0 6px 24px rgba(147,197,253,0.2)',
          backdropFilter: 'blur(1px)',
        }}
      >
        <div
          className='absolute rounded-full'
          style={{
            top: '14%',
            left: '18%',
            width: '26%',
            height: '22%',
            background:
              'radial-gradient(ellipse, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 100%)',
            filter: 'blur(0.5px)',
          }}
        />
        <div
          className='absolute rounded-full'
          style={{
            top: '12%',
            left: '22%',
            width: '8%',
            height: '8%',
            background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div
          className='absolute rounded-full'
          style={{
            bottom: '8%',
            right: '14%',
            width: '40%',
            height: '30%',
            background:
              'radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, rgba(191,219,254,0.15) 50%, rgba(255,255,255,0) 100%)',
            filter: 'blur(2px)',
          }}
        />
      </div>
    </div>
  )
}

const Login = () => {
  const { token, setToken, backendUrl } = useContext(AppContext)
  const { setAToken } = useContext(AdminContext)
  const { setBToken } = useContext(BranchesContext)
  const navigate = useNavigate()
  const location = useLocation()

  const [state, setState] = useState(location.state?.tab === 'register' ? 'Sign Up' : 'Login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({ line1: '', line2: '' })
  const [isLoading, setIsLoading] = useState(false)

  const [burstBubbles, setBurstBubbles] = useState([])

  useEffect(() => { if (token) navigate('/') }, [token])
  useEffect(() => { if (location.state?.tab === 'register') setState('Sign Up') }, [location.state])

  const triggerBubbleBurst = useCallback(() => {
    const count = 65
    const bubbles = Array.from({ length: count }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      size: 18 + Math.random() * 100,
      left: 2 + Math.random() * 96,
      drift: (Math.random() - 0.5) * 220,
      duration: 2.2 + Math.random() * 1.6,
      delay: Math.random() * 0.6,
      opacity: 0.5 + Math.random() * 0.45,
    }))
    setBurstBubbles(bubbles)
    setTimeout(() => setBurstBubbles([]), 4200)
  }, [])

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    if (isSignUp) {
      if (!/^[a-zA-Z\s.]+$/.test(name.trim()))
        return toast.error('Name must contain letters only.')
      if (!/^09\d{9}$/.test(phone))
        return toast.error('Phone number must be 11 digits and start with 09.')
      if (password.length < 8)
        return toast.error('Password must be at least 8 characters.')
      if (password !== confirmPass)
        return toast.error('Passwords do not match.')
    }

    triggerBubbleBurst()
    setIsLoading(true)

    try {
      if (state === 'Sign Up') {
        const payload = { name, email, password, phone, address: JSON.stringify(address) }
        const { data } = await axios.post(backendUrl + '/api/user/register', payload)

        await new Promise(res => setTimeout(res, 500))

        if (data.success) {
          toast.success('Account created! Please log in.')
          setName(''); setEmail(''); setPassword(''); setConfirmPass(''); setPhone('')
          setAddress({ line1: '', line2: '' })
          setState('Login')
        } else {
          toast.error(data.message)
        }
        setIsLoading(false)
        return
      }

      const { data } = await axios.post(backendUrl + '/api/auth/login', { email, password })

      await new Promise(res => setTimeout(res, 500))

      if (data.success) {
        const { token: newToken, role } = data.data
        if (role === 'user') {
          setToken(newToken)
          localStorage.setItem('token', newToken)
          navigate('/')
        } else if (role === 'branch') {
          setBToken(newToken)
          localStorage.setItem('bToken', newToken)
          navigate('/branch/dashboard')
        } else if (role === 'admin') {
          setAToken(newToken)
          localStorage.setItem('aToken', newToken)
          navigate('/admin/dashboard')
        }
      } else {
        toast.error(data.message)
        setIsLoading(false)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      setIsLoading(false)
    }
  }

  const onGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/user/google-auth', {
        idToken: credentialResponse.credential,
      })
      if (data.success) {
        setToken(data.data.token)
        localStorage.setItem('token', data.data.token)
        navigate('/')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google login failed')
    }
  }

  const isSignUp = state === 'Sign Up'
  const phoneValid = /^09\d{9}$/.test(phone)
  const phoneInvalid = phone.length > 0 && !phoneValid
  const passShort = password.length > 0 && password.length < 8
  const passMismatch = confirmPass.length > 0 && confirmPass !== password
  const passMatch = confirmPass.length > 0 && confirmPass === password

  return (
    <div
      style={{ fontFamily: "'Georgia', serif" }}
      className='min-h-screen w-full flex relative overflow-hidden bg-white'
    >

      <style>{`
        /* Ambient bubbles — slow drift in place, stay on screen */
        @keyframes bubbleDrift1 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(25px, -35px) scale(1.05); }
          100% { transform: translate(-20px, 15px) scale(0.97); }
        }
        @keyframes bubbleDrift2 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-30px, 30px) scale(1.08); }
          100% { transform: translate(20px, -25px) scale(0.95); }
        }
        @keyframes bubbleDrift3 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(35px, 20px) scale(0.94); }
          100% { transform: translate(-25px, -30px) scale(1.06); }
        }

        /* Burst bubbles — one-shot rise and fade */
        @keyframes burstRise {
          0% {
            transform: translate(0, 0) scale(0.3);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          60% {
            transform: translate(var(--drift), -70vh) scale(1.1);
            opacity: 0.95;
          }
          100% {
            transform: translate(calc(var(--drift) * 1.4), -110vh) scale(1.3);
            opacity: 0;
          }
        }

        @keyframes waveDrift1 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveDrift2 {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        .bubble-drift:nth-of-type(3n+1) { animation: bubbleDrift1 infinite alternate ease-in-out; }
        .bubble-drift:nth-of-type(3n+2) { animation: bubbleDrift2 infinite alternate ease-in-out; }
        .bubble-drift:nth-of-type(3n+3) { animation: bubbleDrift3 infinite alternate ease-in-out; }

        .wave-1 { animation: waveDrift1 30s linear infinite; }
        .wave-2 { animation: waveDrift2 40s linear infinite; }
        .burst-bubble {
          animation: burstRise var(--duration) cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        .form-card-clip {
          clip-path: none;
        }
        @media (min-width: 640px) {
          .form-card-clip {
            clip-path: polygon(0 0, 92% 0, 100% 8%, 100% 100%, 0 100%);
          }
        }
      `}</style>

      {/* ===== BACKGROUND ===== */}
      <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden'>

        <div
          className='absolute inset-0'
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 35%, #dbeafe 75%, #bfdbfe 100%)',
          }}
        />

        {/* ===== AMBIENT BUBBLES — drift in place, never leave screen ===== */}
        <Bubble size={120} top='8%'   left='4%'   duration='14s' delay='0s'    opacity={0.85} />
        <Bubble size={38}  top='20%'  left='9%'   duration='11s' delay='2s'    opacity={0.6} />
        <Bubble size={70}  top='32%'  left='15%'  duration='16s' delay='4s'    opacity={0.75} />
        <Bubble size={65}  top='58%'  left='22%'  duration='13s' delay='1s'    opacity={0.7} />
        <Bubble size={50}  top='72%'  left='28%'  duration='15s' delay='3s'    opacity={0.7} />

        <Bubble size={90}  top='42%'  left='38%'  duration='18s' delay='2.5s'  opacity={0.8} />
        <Bubble size={48}  top='15%'  left='45%'  duration='12s' delay='5s'    opacity={0.65} />
        <Bubble size={60}  top='68%'  left='52%'  duration='17s' delay='1.5s'  opacity={0.7} />

        <Bubble size={72}  top='25%'  left='58%'  duration='14s' delay='3.5s'  opacity={0.72} />
        <Bubble size={45}  top='55%'  left='64%'  duration='13s' delay='0.5s'  opacity={0.65} />
        <Bubble size={80}  top='78%'  left='74%'  duration='16s' delay='2s'    opacity={0.75} />
        <Bubble size={42}  top='10%'  left='78%'  duration='11s' delay='4.5s'  opacity={0.6} />
        <Bubble size={55}  top='48%'  left='84%'  duration='15s' delay='1s'    opacity={0.7} />
        <Bubble size={88}  top='20%'  left='88%'  duration='18s' delay='3s'    opacity={0.7} />
        <Bubble size={100} top='65%'  left='94%'  duration='19s' delay='2s'    opacity={0.7} />

        <div className='absolute bottom-0 left-0 right-0 w-full'>
          <div className='absolute bottom-0 left-0 w-[200%] wave-1'>
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className='w-full h-[320px] block'>
              <defs>
                <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.75" />
                </linearGradient>
              </defs>
              <path
                fill="url(#waveGrad1)"
                d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,213.3C840,224,960,224,1080,208C1200,192,1320,160,1380,144L1440,128L1440,320L0,320Z"
              />
            </svg>
          </div>

          <div className='absolute bottom-0 left-0 w-[200%] wave-2'>
            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className='w-full h-[240px] block'>
              <defs>
                <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                fill="url(#waveGrad2)"
                d="M0,256L60,240C120,224,240,192,360,192C480,192,600,224,720,234.7C840,245,960,235,1080,218.7C1200,203,1320,181,1380,170.7L1440,160L1440,320L0,320Z"
              />
            </svg>
          </div>
        </div>

      </div>
      {/* ===== END BACKGROUND ===== */}

      {/* ===== BURST BUBBLES OVERLAY — only on login/signup click ===== */}
      <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-20'>
        {burstBubbles.map((b, i) => (
          <div
            key={b.id}
            className='absolute burst-bubble'
            style={{
              bottom: '-80px',
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              '--drift': `${b.drift}px`,
              '--duration': `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              opacity: 0,
            }}
          >
            <div
              className='w-full h-full rounded-full relative'
              style={{
                background:
                  'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.45) 8%, rgba(191,219,254,0.35) 28%, rgba(147,197,253,0.25) 55%, rgba(96,165,250,0.15) 80%, rgba(59,130,246,0.1) 100%)',
                boxShadow:
                  'inset -8px -12px 22px rgba(59,130,246,0.2), inset 6px 8px 18px rgba(255,255,255,0.8), inset 0 0 0 1px rgba(255,255,255,0.55), 0 6px 24px rgba(147,197,253,0.3)',
                opacity: b.opacity,
              }}
            >
              <div
                className='absolute rounded-full'
                style={{
                  top: '14%',
                  left: '18%',
                  width: '26%',
                  height: '22%',
                  background:
                    'radial-gradient(ellipse, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 100%)',
                }}
              />
              <div
                className='absolute rounded-full'
                style={{
                  top: '12%',
                  left: '22%',
                  width: '8%',
                  height: '8%',
                  background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* ===== END BURST BUBBLES ===== */}

      {/* Main Content */}
      <div className='relative z-10 w-full min-h-screen flex flex-col lg:flex-row'>

        {/* Left Panel - Only show on Login */}
        {!isSignUp && (
          <div className='hidden lg:flex w-1/2 flex-col justify-center items-center px-4 xl:px-6 py-12 lg:pr-4'>
            <div className='w-full max-w-xl flex flex-col justify-center items-center px-10 xl:px-14 py-16 text-center'>
              <img src={assets.logo} alt='Selfie Wash' className='w-56 mb-16' />

              <div className='border-l-4 border-blue-300 pl-10 text-left'>
                <p className='text-blue-500 font-sans text-xs uppercase tracking-[0.4em] mb-4'>
                  Welcome back
                </p>
                <h1 className='text-slate-900 leading-[1.1] text-5xl font-bold mb-4'>
                  Good to see
                  <br />
                  you again.
                </h1>
                <p className='text-slate-500 font-sans text-sm leading-relaxed max-w-md'>
                  Access your appointments, track your laundry, and manage your preferences.
                </p>
              </div>

              <div className='grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200 w-full max-w-md'>
                {['Pickup', 'Wash', 'Deliver'].map((label, i) => (
                  <div key={label} className='group text-center'>
                    <p className='text-blue-300 font-sans text-sm font-bold tracking-widest group-hover:text-blue-500 transition-colors'>
                      0{i + 1}
                    </p>
                    <p className='text-slate-400 font-sans text-[10px] uppercase tracking-[0.3em] group-hover:text-slate-600 transition-colors'>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Form */}
        <div className={`flex-1 flex items-center justify-center px-4 sm:px-10 lg:px-6 py-8 sm:py-12 ${isSignUp ? 'lg:pl-6' : 'lg:pl-4'}`}>
          <div
            className={`form-card-clip w-full max-w-md mx-auto bg-white/85 backdrop-blur-xl border border-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_20px_50px_-12px_rgba(15,23,42,0.18)] px-6 sm:px-10 py-8 sm:py-10 ${isSignUp ? 'lg:max-w-lg' : ''}`}
          >

            <div className='mb-8 sm:mb-10'>
              <p className='text-blue-500 font-sans text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-1'>
                {isSignUp ? 'Get started' : 'Welcome back'}
              </p>
              <h2 className='text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight'>
                {isSignUp ? 'Create your account.' : 'Log in.'}
              </h2>
              <p className='text-slate-500 font-sans text-sm'>
                {isSignUp ? 'Start your laundry journey with us.' : 'Welcome back to Selfie Wash.'}
              </p>
            </div>

            <form onSubmit={onSubmitHandler} className='space-y-6 sm:space-y-7'>

              {isSignUp && (
                <>
                  <div className='group'>
                    <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans block mb-2 group-focus-within:text-blue-600 transition-colors'>
                      Full name
                    </label>
                    <input
                      className={inputCls}
                      type='text'
                      value={name}
                      onChange={e => {
                        const v = e.target.value
                        if (/^[a-zA-Z\s.]*$/.test(v)) setName(v)
                      }}
                      placeholder='Enter your full name'
                      required
                    />
                  </div>

                  <div className='group'>
                    <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans block mb-2 group-focus-within:text-blue-600 transition-colors'>
                      Phone number
                    </label>
                    <input
                      className={`${inputCls} ${phoneInvalid ? 'border-red-400' : phoneValid ? 'border-green-400' : ''}`}
                      type='tel'
                      value={phone}
                      onChange={e => {
                        const v = e.target.value
                        if (/^[0-9]*$/.test(v) && v.length <= 11) setPhone(v)
                      }}
                      placeholder='09123456789'
                      required
                    />
                    {phoneInvalid && (
                      <p className='text-red-500 font-sans text-[9px] uppercase tracking-widest mt-2'>
                        Must be 11 digits starting with 09
                      </p>
                    )}
                  </div>

                  <div className='flex flex-col sm:flex-row gap-4 sm:gap-4'>
                    <div className='flex-1 group'>
                      <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans block mb-2 group-focus-within:text-blue-600 transition-colors'>
                        Address 1
                      </label>
                      <input
                        className={inputCls}
                        type='text'
                        value={address.line1}
                        onChange={e => setAddress({ ...address, line1: e.target.value })}
                        placeholder='Street, Barangay'
                        required
                      />
                    </div>
                    <div className='flex-1 group'>
                      <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans block mb-2 group-focus-within:text-blue-600 transition-colors'>
                        Address 2
                      </label>
                      <input
                        className={inputCls}
                        type='text'
                        value={address.line2}
                        onChange={e => setAddress({ ...address, line2: e.target.value })}
                        placeholder='City, Province'
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className='group'>
                <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans block mb-2 group-focus-within:text-blue-600 transition-colors'>
                  Email address
                </label>
                <input
                  className={inputCls}
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  required
                />
              </div>

              <div className='group'>
                <div className='flex justify-between items-center mb-2'>
                  <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans group-focus-within:text-blue-600 transition-colors'>
                    Password
                  </label>
                  {!isSignUp && (
                    <Link
                      to='/forgot-password'
                      className='text-[10px] text-slate-400 hover:text-blue-600 font-sans uppercase tracking-widest transition-colors'
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <PasswordInput
                  className={`${inputCls} ${isSignUp && passShort ? 'border-red-400' : ''}`}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Minimum 8 characters' : 'Enter your password'}
                  required
                />
                {isSignUp && passShort && (
                  <p className='text-red-500 font-sans text-[9px] uppercase tracking-widest mt-2'>
                    Minimum 8 characters
                  </p>
                )}
              </div>

              {isSignUp && (
                <div className='group'>
                  <label className='text-[10px] uppercase tracking-[0.3em] text-slate-500 font-sans block mb-2 group-focus-within:text-blue-600 transition-colors'>
                    Confirm password
                  </label>
                  <PasswordInput
                    className={`${inputCls} ${passMismatch ? 'border-red-400' : passMatch ? 'border-green-400' : ''}`}
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder='Repeat your password'
                    required
                  />
                  {passMismatch && (
                    <p className='text-red-500 font-sans text-[9px] uppercase tracking-widest mt-2'>
                      Passwords do not match
                    </p>
                  )}
                  {passMatch && (
                    <p className='text-green-600 font-sans text-[9px] uppercase tracking-widest mt-2'>
                      Match confirmed
                    </p>
                  )}
                </div>
              )}

              <button
                type='submit'
                disabled={isLoading}
                className='group w-full bg-blue-600 text-white py-4 font-sans text-xs tracking-[0.3em] uppercase font-bold hover:bg-blue-700 transition-colors duration-300 relative overflow-hidden disabled:opacity-80 disabled:cursor-wait'
              >
                <span className='relative z-10'>
                  {isLoading ? (isSignUp ? 'Creating...' : 'Logging in...') : (isSignUp ? 'Create account' : 'Log in')}
                </span>
                <span className='relative z-10 inline-block ml-3 group-hover:translate-x-1 transition-transform duration-300'>→</span>
              </button>

            </form>

            <div className='mt-6 sm:mt-8'>
              <div className='flex items-center gap-4 mb-5'>
                <div className='flex-1 h-px bg-slate-200' />
                <span className='text-slate-400 font-sans text-[9px] uppercase tracking-[0.3em] whitespace-nowrap'>
                  Or continue with
                </span>
                <div className='flex-1 h-px bg-slate-200' />
              </div>

              <div className='flex justify-center transform hover:scale-[1.02] transition-transform duration-300'>
                <div className='w-full flex justify-center'>
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={() => toast.error('Google login failed')}
                    width='100%'
                    text={isSignUp ? 'signup_with' : 'signin_with'}
                    shape='rectangular'
                    theme='outline'
                  />
                </div>
              </div>
            </div>

            <div className='mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200'>
              <p className='text-center text-sm text-slate-500 font-sans'>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type='button'
                  onClick={() => setState(isSignUp ? 'Login' : 'Sign Up')}
                  className='text-blue-600 font-bold ml-2 hover:text-blue-800 transition-colors hover:underline'
                >
                  {isSignUp ? 'Log in' : 'Sign up'}
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Login