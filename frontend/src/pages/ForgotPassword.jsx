import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return toast.error('Please enter your email.')

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
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white min-h-[80vh] flex'>

      {/* ── LEFT PANEL ── */}
      <div className='hidden md:flex w-2/5 bg-blueb-600 flex-col justify-between px-12 py-14 relative overflow-hidden flex-shrink-0'>
        <div
          className='absolute inset-0 pointer-events-none'
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
        />
        <div className='relative z-10'>
          <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans'>Selfie Wash</span>
          <div className='h-px bg-white/10 mt-3' />
        </div>
        <div className='relative z-10'>
          <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans block mb-4'>Account Recovery</span>
          <h2
            className='leading-none text-white mb-6'
            style={{ fontSize: 'clamp(36px, 4vw, 68px)', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            Forgot<br />your<br />password?
          </h2>
          <p className='text-white/60 font-sans text-sm leading-relaxed max-w-xs'>
            No worries. Enter your registered email and we'll send you a secure reset link valid for 15 minutes.
          </p>
        </div>
        <div className='relative z-10 grid grid-cols-3 gap-px bg-white/10'>
          {['Secure', 'Quick', 'Simple'].map((label, i) => (
            <div key={label} className='bg-blue-600 px-4 py-5 flex flex-col gap-1'>
              <span className='text-white/20 font-sans font-bold leading-none' style={{ fontSize: '26px' }}>
                0{i + 1}
              </span>
              <span className='font-sans text-xs text-white/60 uppercase tracking-widest'>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className='flex-1 flex flex-col justify-center px-8 md:px-14 py-14'>
        <div className='max-w-sm w-full mx-auto'>

          <div className='mb-8'>
            <span className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-3'>
              Account Recovery
            </span>
            <div className='h-px bg-blue-100 mb-7' />
            <h1
              className='leading-none text-blue-900'
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              {sent ? 'Check your email.' : 'Reset Password.'}
            </h1>
            <p className='font-sans text-sm text-neutral-400 mt-2'>
              {sent
                ? <>We sent a reset link to <span className='text-blue-500 font-medium'>{email}</span>. It expires in 15 minutes.</>
                : "Enter your registered email and we'll send you a reset link."
              }
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              <div className='flex flex-col gap-1.5'>
                <label className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans'>
                  Email Address
                </label>
                <input
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='you@email.com'
                  className='w-full px-4 py-3 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
                  required
                />
              </div>

              <button
                type='submit'
                disabled={loading}
                className='group relative overflow-hidden bg-blue-600 text-white mt-2 py-3.5 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-3 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <span className='relative z-10'>{loading ? 'Sending...' : 'Send Reset Link'}</span>
                {!loading && <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>}
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              </button>
            </form>
          ) : (
            <div className='border border-blue-100 p-6 text-center'>
              <p className='font-sans text-xs text-neutral-400 uppercase tracking-widest'>
                Didn't receive it? Check your spam folder.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className='mt-4 font-sans text-[10px] text-blue-400 hover:text-blue-600 uppercase tracking-widest transition-colors'
              >
                Try a different email
              </button>
            </div>
          )}

          <div className='mt-6'>
            <div className='h-px bg-blue-100 mb-5' />
            <p className='font-sans text-sm text-neutral-400 text-center'>
              Remembered your password?{' '}
              <Link to='/login' className='text-blue-500 hover:text-blue-700 cursor-pointer transition-colors'>
                Back to Login
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}