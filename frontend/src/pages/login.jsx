import React, { useState, useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const inputCls =
  'w-full px-4 py-3 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'

// Eye icons
const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

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
        style={{ paddingRight: '2.75rem' }}
      />
      <button
        type='button'
        onClick={() => setShow(s => !s)}
        className='absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 hover:text-violet-500 transition-colors focus:outline-none'
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOpen /> : <EyeClosed />}
      </button>
    </div>
  )
}

const Login = () => {
  const { token, setToken, backendUrl } = useContext(AppContext)
  const navigate  = useNavigate()
  const location  = useLocation()

  const [state, setState]             = useState(location.state?.tab === 'register' ? 'Sign Up' : 'Login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [name, setName]               = useState('')
  const [phone, setPhone]             = useState('')
  const [address, setAddress]         = useState({ line1: '', line2: '' })

  useEffect(() => { if (token) navigate('/') }, [token])
  useEffect(() => { if (location.state?.tab === 'register') setState('Sign Up') }, [location.state])

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    if (isSignUp) {
      // ── Name validation
      if (!/^[a-zA-Z\s.]+$/.test(name.trim()))
        return toast.error('Name must contain letters only.')

      // ── Phone validation
      if (!/^09\d{9}$/.test(phone))
        return toast.error('Phone number must be 11 digits and start with 09.')

      // ── Password length
      if (password.length < 8)
        return toast.error('Password must be at least 8 characters.')

      // ── Confirm password
      if (password !== confirmPass)
        return toast.error('Passwords do not match.')
    }

    try {
      const endpoint = state === 'Sign Up' ? '/api/user/register' : '/api/user/login'
      const payload  = state === 'Sign Up'
        ? { name, email, password, phone, address: JSON.stringify(address) }
        : { email, password }

      const { data } = await axios.post(backendUrl + endpoint, payload)

      if (data.success) {
        if (state === 'Sign Up') {
          toast.success('Account created! Please log in.')
          setName('')
          setEmail('')
          setPassword('')
          setConfirmPass('')
          setPhone('')
          setAddress({ line1: '', line2: '' })
          setState('Login')
        } else {
          setToken(data.data.token)
          localStorage.setItem('token', data.data.token)
          navigate('/')
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
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

  // ── Live validation states
  const phoneValid   = /^09\d{9}$/.test(phone)
  const phoneInvalid = phone.length > 0 && !phoneValid
  const passShort    = password.length > 0 && password.length < 8
  const passMismatch = confirmPass.length > 0 && confirmPass !== password
  const passMatch    = confirmPass.length > 0 && confirmPass === password

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
          <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans block mb-4'>
            {isSignUp ? 'Join Us' : 'Welcome Back'}
          </span>
          <h2
            className='leading-none text-white mb-6'
            style={{ fontSize: 'clamp(36px, 4vw, 68px)', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            {isSignUp ? <>Clean<br />clothes,<br />zero<br />hassle.</> : <>Good to<br />see you<br />again.</>}
          </h2>
          <p className='text-white/60 font-sans text-sm leading-relaxed max-w-xs'>
            {isSignUp
              ? 'Create an account to start booking laundry pickups at your nearest Selfie Wash branch.'
              : 'Log in to manage your appointments, track your laundry, and more.'}
          </p>
        </div>
        <div className='relative z-10 grid grid-cols-3 gap-px bg-white/10'>
          {['Pickup', 'Wash', 'Deliver'].map((label, i) => (
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
      <div className='flex-1 flex flex-col justify-center px-8 md:px-14 py-14 overflow-y-auto'>
        <div className='max-w-sm w-full mx-auto'>

          <div className='mb-8'>
            <span className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans block mb-3'>
              {isSignUp ? 'New Account' : 'Secure Login'}
            </span>
            <div className='h-px bg-violet-100 mb-7' />
            <h1
              className='leading-none text-violet-900'
              style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              {isSignUp ? 'Create Account.' : 'Login.'}
            </h1>
            <p className='font-sans text-sm text-neutral-400 mt-2'>
              Please {isSignUp ? 'sign up' : 'log in'} to book an appointment.
            </p>
          </div>

          <form onSubmit={onSubmitHandler} className='flex flex-col gap-4'>

            {isSignUp && (
              <>
                {/* Name */}
                <div className='flex flex-col gap-1.5'>
                  <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Full Name</label>
                  <input
                    className={inputCls}
                    type='text'
                    value={name}
                    onChange={e => {
                      const v = e.target.value
                      if (/^[a-zA-Z\s.]*$/.test(v)) setName(v)
                    }}
                    placeholder='Juan Dela Cruz'
                    required
                  />
                </div>

                {/* Phone */}
                <div className='flex flex-col gap-1.5'>
                  <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Phone Number</label>
                  <input
                    className={inputCls + (phoneInvalid ? ' border-red-300 focus:border-red-400' : phoneValid ? ' border-green-300 focus:border-green-400' : '')}
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
                    <p className='font-sans text-[10px] text-red-400 uppercase tracking-widest'>Must be 11 digits starting with 09</p>
                  )}
                </div>

                {/* Address */}
                <div className='flex flex-col gap-1.5'>
                  <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Address Line 1</label>
                  <input className={inputCls} type='text' value={address.line1}
                    onChange={e => setAddress({ ...address, line1: e.target.value })}
                    placeholder='Street, Barangay' required />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Address Line 2</label>
                  <input className={inputCls} type='text' value={address.line2}
                    onChange={e => setAddress({ ...address, line2: e.target.value })}
                    placeholder='City, Province' required />
                </div>
              </>
            )}

            {/* Email */}
            <div className='flex flex-col gap-1.5'>
              <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Email</label>
              <input className={inputCls} type='email' value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>

            {/* Password */}
            <div className='flex flex-col gap-1.5'>
              <div className='flex items-center justify-between'>
                <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Password</label>
                {!isSignUp && (
                  <Link
                    to='/forgot-password'
                    className='font-sans text-[10px] text-violet-400 hover:text-violet-600 uppercase tracking-widest transition-colors'
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <PasswordInput
                className={inputCls + (isSignUp && passShort ? ' border-red-300 focus:border-red-400' : '')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 8 characters' : ''}
                required
              />
              {isSignUp && passShort && (
                <p className='font-sans text-[10px] text-red-400 uppercase tracking-widest'>Minimum 8 characters</p>
              )}
            </div>

            {/* Confirm Password */}
            {isSignUp && (
              <div className='flex flex-col gap-1.5'>
                <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>Confirm Password</label>
                <PasswordInput
                  className={
                    inputCls +
                    (passMismatch ? ' border-red-300 focus:border-red-400' : passMatch ? ' border-green-300 focus:border-green-400' : '')
                  }
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder='Repeat new password'
                  required
                />
                {passMismatch && (
                  <p className='font-sans text-[10px] text-red-400 uppercase tracking-widest'>Passwords do not match</p>
                )}
                {passMatch && (
                  <p className='font-sans text-[10px] text-green-500 uppercase tracking-widest'>Passwords match ✓</p>
                )}
              </div>
            )}

            <button
              type='submit'
              className='group relative overflow-hidden bg-violet-600 text-white mt-2 py-3.5 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-3'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              <span className='relative z-10'>{isSignUp ? 'Create Account' : 'Login'}</span>
              <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>
              <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            </button>

          </form>

          {/* Google OAuth */}
          <div className='mt-5'>
            <div className='relative flex items-center gap-3 mb-4'>
              <div className='flex-1 h-px bg-violet-100' />
              <span className='font-sans text-[10px] text-neutral-400 uppercase tracking-widest'>or continue with</span>
              <div className='flex-1 h-px bg-violet-100' />
            </div>
            <div className='flex justify-center'>
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={() => toast.error('Google login failed')}
                width='384'
                text={isSignUp ? 'signup_with' : 'signin_with'}
                shape='rectangular'
                theme='outline'
              />
            </div>
          </div>

          {/* toggle */}
          <div className='mt-6'>
            <div className='h-px bg-violet-100 mb-5' />
            <p className='font-sans text-sm text-neutral-400 text-center'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <span
                onClick={() => setState(isSignUp ? 'Login' : 'Sign Up')}
                className='text-violet-500 hover:text-light-blue-700 cursor-pointer ml-1.5 transition-colors'
              >
                {isSignUp ? 'Login here' : 'Sign up here'}
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Login