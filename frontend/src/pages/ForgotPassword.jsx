import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const inputCls =
  'w-full px-0 py-3.5 border-b-2 border-slate-300 font-sans text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all duration-300 bg-transparent'

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

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [burstBubbles, setBurstBubbles] = useState([])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return toast.error('Please enter your email.')

    triggerBubbleBurst()
    setLoading(true)
    try {
      await axios.post('/api/user/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

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

        {/* ===== AMBIENT BUBBLES ===== */}
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

        {/* WAVES */}
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

      {/* ===== BURST BUBBLES OVERLAY ===== */}
      <div className='absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-20'>
        {burstBubbles.map((b) => (
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

        {/* Left Panel — always visible on desktop */}
        <div className='hidden lg:flex w-1/2 flex-col justify-center items-center px-4 xl:px-6 py-12 lg:pr-4'>
          <div className='w-full max-w-xl flex flex-col justify-center items-center px-10 xl:px-14 py-16 text-center'>
            <img src={assets.logo} alt='Selfie Wash' className='w-56 mb-16' />

            <div className='border-l-4 border-blue-300 pl-10 text-left'>
              <p className='text-blue-500 font-sans text-xs uppercase tracking-[0.4em] mb-4'>
                Account recovery
              </p>
              <h1 className='text-slate-900 leading-[1.1] text-5xl font-bold mb-4'>
                Forgot
                <br />
                your password?
              </h1>
              <p className='text-slate-500 font-sans text-sm leading-relaxed max-w-md'>
                No worries. Enter your registered email and we'll send you a secure reset link valid for 15 minutes.
              </p>
            </div>

            <div className='grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-200 w-full max-w-md'>
              {['Secure', 'Quick', 'Simple'].map((label, i) => (
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

        {/* Right Panel — Form */}
        <div className='flex-1 flex items-center justify-center px-4 sm:px-10 lg:px-6 py-8 sm:py-12 lg:pl-4'>
          <div className='form-card-clip w-full max-w-md mx-auto bg-white/85 backdrop-blur-xl border border-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_20px_50px_-12px_rgba(15,23,42,0.18)] px-6 sm:px-10 py-8 sm:py-10'>

            <div className='mb-8 sm:mb-10'>
              <p className='text-blue-500 font-sans text-[10px] sm:text-[11px] uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-1'>
                Account recovery
              </p>
              <h2 className='text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-tight'>
                {sent ? 'Check your email.' : 'Reset password.'}
              </h2>
              <p className='text-slate-500 font-sans text-sm'>
                {sent
                  ? <>We sent a reset link to <span className='text-blue-600 font-medium'>{email}</span>. It expires in 15 minutes.</>
                  : "Enter your registered email and we'll send you a reset link."
                }
              </p>
            </div>

            {!sent ? (
              <form onSubmit={handleSubmit} className='space-y-6 sm:space-y-7'>

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

                <button
                  type='submit'
                  disabled={loading}
                  className='group w-full bg-blue-600 text-white py-4 font-sans text-xs tracking-[0.3em] uppercase font-bold hover:bg-blue-700 transition-colors duration-300 relative overflow-hidden disabled:opacity-80 disabled:cursor-wait'
                >
                  <span className='relative z-10'>
                    {loading ? 'Sending...' : 'Send reset link'}
                  </span>
                  {!loading && (
                    <span className='relative z-10 inline-block ml-3 group-hover:translate-x-1 transition-transform duration-300'>
                      →
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <div className='border border-blue-100 bg-white/60 px-5 py-5 text-center'>
                <p className='font-sans text-xs text-slate-500 leading-relaxed'>
                  Didn't receive it? Check your spam folder.
                </p>
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className='mt-4 font-sans text-[10px] text-blue-500 hover:text-blue-700 uppercase tracking-widest transition-colors'
                >
                  Try a different email
                </button>
              </div>
            )}

            <div className='mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200'>
              <p className='text-center text-sm text-slate-500 font-sans'>
                Remembered your password?
                <Link
                  to='/login'
                  className='text-blue-600 font-bold ml-2 hover:text-blue-800 transition-colors hover:underline'
                >
                  Back to login
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}