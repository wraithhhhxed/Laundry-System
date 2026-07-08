import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

// Eye icons (same as Login)
const EyeOpen = () => (
  <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
    stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
    <circle cx='12' cy='12' r='3' />
  </svg>
)
const EyeClosed = () => (
  <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'
    stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' />
    <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' />
    <line x1='1' y1='1' x2='23' y2='23' />
  </svg>
)

const inputCls = 'w-full px-4 py-3 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false)
  return (
    <div className='relative'>
      <input
        className={inputCls}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: '2.75rem' }}
        required
      />
      <button
        type='button'
        onClick={() => setShow(s => !s)}
        className='absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 hover:text-violet-500 transition-colors focus:outline-none'
        tabIndex={-1}
      >
        {show ? <EyeOpen /> : <EyeClosed />}
      </button>
    </div>
  )
}

export default function ResetPassword() {
  const { token }   = useParams()
  const navigate    = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim())          return toast.error('Please enter a new password.')
    if (!confirm.trim())           return toast.error('Please confirm your password.')
    if (password !== confirm)      return toast.error('Passwords do not match.')
    if (password.length < 8)       return toast.error('Password must be at least 8 characters.')

    setLoading(true)
    try {
      await axios.post(`/api/user/reset-password/${token}`, { password })
      setDone(true)
      toast.success('Password reset! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white min-h-[80vh] flex'>

      {/* ── LEFT PANEL ── */}
      <div className='hidden md:flex w-2/5 bg-violet-600 flex-col justify-between px-12 py-14 relative overflow-hidden flex-shrink-0'>
        <div
          className='absolute inset-0 pointer-events-none'
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
        />
        <div className='relative z-10'>
          <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans'>Selfie Wash</span>
          <div className='h-px bg-white/10 mt-3' />
        </div>
        <div className='relative z-10'>
          <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans block mb-4'>New Password</span>
          <h2
            className='leading-none text-white mb-6'
            style={{ fontSize: 'clamp(36px, 4vw, 68px)', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            {done ? <>All<br />done!</> : <>Almost<br />there.</>}
          </h2>
          <p className='text-white/60 font-sans text-sm leading-relaxed max-w-xs'>
            {done
              ? 'Your password has been reset. Taking you back to login.'
              : 'Choose a strong password with at least 8 characters.'}
          </p>
        </div>
        <div className='relative z-10 grid grid-cols-3 gap-px bg-white/10'>
          {['Secure', 'Quick', 'Simple'].map((label, i) => (
            <div key={label} className='bg-violet-600 px-4 py-5 flex flex-col gap-1'>
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
            <span className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans block mb-3'>
              {done ? 'Success' : 'New Password'}
            </span>
            <div className='h-px bg-violet-100 mb-7' />
            <h1
              className='leading-none text-violet-900'
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              {done ? 'Password Reset.' : 'Set New Password.'}
            </h1>
            <p className='font-sans text-sm text-neutral-400 mt-2'>
              {done
                ? 'Redirecting you to login...'
                : 'Enter and confirm your new password below.'}
            </p>
          </div>

          {!done && (
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
              <div className='flex flex-col gap-1.5'>
                <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>
                  New Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='Min. 8 characters'
                />
              </div>

              <div className='flex flex-col gap-1.5'>
                <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>
                  Confirm Password
                </label>
                <PasswordInput
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder='Repeat your password'
                />
                {confirm && confirm !== password && (
                  <p className='font-sans text-[10px] text-red-400 uppercase tracking-widest'>Passwords do not match</p>
                )}
                {confirm && confirm === password && (
                  <p className='font-sans text-[10px] text-green-500 uppercase tracking-widest'>Passwords match ✓</p>
                )}
              </div>

              <button
                type='submit'
                disabled={loading}
                className='group relative overflow-hidden bg-violet-600 text-white mt-2 py-3.5 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-3 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <span className='relative z-10'>{loading ? 'Saving...' : 'Reset Password'}</span>
                {!loading && <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>}
                <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              </button>
            </form>
          )}

          <div className='mt-6'>
            <div className='h-px bg-violet-100 mb-5' />
            <p className='font-sans text-sm text-neutral-400 text-center'>
              Remembered your password?{' '}
              <Link to='/login' className='text-violet-500 hover:text-violet-700 cursor-pointer transition-colors'>
                Back to Login
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}