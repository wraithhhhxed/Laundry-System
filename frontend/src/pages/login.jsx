import React, { useState, useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { AdminContext } from '../context/AdminContext'
import { BranchesContext } from '../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { assets } from '../assets/assets'

const inputCls =
  'w-full px-3.5 py-2 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'

// Eye icons
const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
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
        style={{ paddingRight: '2.5rem' }}
      />
      <button
        type='button'
        onClick={() => setShow(s => !s)}
        className='absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-500 transition-colors focus:outline-none'
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

  useEffect(() => { if (token) navigate('/') }, [token])
  useEffect(() => { if (location.state?.tab === 'register') setState('Sign Up') }, [location.state])

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

    try {
      if (state === 'Sign Up') {
        // Registration — customer/user lang, hindi pinagsasama sa unified login
        const payload = { name, email, password, phone, address: JSON.stringify(address) }
        const { data } = await axios.post(backendUrl + '/api/user/register', payload)

        if (data.success) {
          toast.success('Account created! Please log in.')
          setName('')
          setEmail('')
          setPassword('')
          setConfirmPass('')
          setPhone('')
          setAddress({ line1: '', line2: '' })
          setState('Login')
        } else {
          toast.error(data.message)
        }
        return
      }

      // ─── UNIFIED LOGIN ────────────────────────────────────────────
      const { data } = await axios.post(backendUrl + '/api/auth/login', { email, password })

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

  const phoneValid = /^09\d{9}$/.test(phone)
  const phoneInvalid = phone.length > 0 && !phoneValid
  const passShort = password.length > 0 && password.length < 8
  const passMismatch = confirmPass.length > 0 && confirmPass !== password
  const passMatch = confirmPass.length > 0 && confirmPass === password

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white min-h-screen flex p-4 md:p-8'>

      {/* ── LEFT PANEL ── */}
      <div className='hidden md:flex w-2/5 bg-blue-600 flex-col justify-between px-8 py-10 relative overflow-hidden flex-shrink-0'>
        <div
          className='absolute inset-0 pointer-events-none'
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }}
        />

        <div className='relative z-10 flex flex-col mt-32'>
          {/* Logo - Centered at top */}
          <div className='flex justify-center mb-9'>
            <img src={assets.logo} alt='Selfie Wash' className='w-72' />
          </div>

          {/* Content below logo */}
          <div className='-mt-0.00001'>
            <span className='uppercase tracking-[0.35em] text-[10px] text-white/80 font-sans-bold block mb-2'>
              {isSignUp ? 'Join Us' : 'Welcome Back'}
            </span>
            <h2
              className='leading-none text-white mb-3'
              style={{ fontSize: 'clamp(28px, 3vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              {isSignUp ? <>Clean clothes,<br />zero hassle.</> : <>Good to<br />see you again.</>}
            </h2>
            <p className='text-white/80 font-sans text-sm leading-relaxed max-w-xs'>
              {isSignUp
                ? 'Create an account to start booking laundry pickups at your nearest Selfie Wash branch.'
                : 'Log in to manage your appointments, track your laundry, and more.'}
            </p>
          </div>
        </div>

        <div className='relative z-10 grid grid-cols-3 gap-0.5 bg-white/40'>
          {['Pickup', 'Wash', 'Deliver'].map((label, i) => (
            <div key={label} className='bg-blue-600 px-3 py-3 flex flex-col gap-0.5'>
              <span className='text-white font-sans font-bold leading-none' style={{ fontSize: '20px' }}>
                0{i + 1}
              </span>
              <span className='font-sans text-[9px] text-white uppercase tracking-widest'>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className='flex-1 flex flex-col justify-center px-4 md:px-8 lg:px-12 py-6 overflow-y-auto'>
        <div className='max-w-sm w-full mx-auto'>

          <div className='mb-5'>
            <div className='h-px bg-blue-100 mb-4' />
            <h1
              className='leading-none text-blue-900'
              style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              {isSignUp ? 'Create Account.' : 'Login.'}
            </h1>
            <p className='font-sans text-sm text-black-400 mt-1'>
              Please {isSignUp ? 'sign up' : 'log in'} to book an appointment.
            </p>
          </div>

          <form onSubmit={onSubmitHandler} className='flex flex-col gap-2.5'>

            {isSignUp && (
              <>
                <div className='flex flex-col gap-0.5'>
                  <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Full Name</label>
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

                <div className='flex flex-col gap-0.5'>
                  <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Phone Number</label>
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
                    <p className='font-sans text-[8px] text-red-400 uppercase tracking-widest mt-0.5'>Must be 11 digits starting with 09</p>
                  )}
                </div>

                <div className='flex gap-2'>
                  <div className='flex flex-col gap-0.5 flex-1'>
                    <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Address 1</label>
                    <input className={inputCls} type='text' value={address.line1}
                      onChange={e => setAddress({ ...address, line1: e.target.value })}
                      placeholder='Street, Barangay' required />
                  </div>
                  <div className='flex flex-col gap-0.5 flex-1'>
                    <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Address 2</label>
                    <input className={inputCls} type='text' value={address.line2}
                      onChange={e => setAddress({ ...address, line2: e.target.value })}
                      placeholder='City, Province' required />
                  </div>
                </div>
              </>
            )}

            <div className='flex flex-col gap-0.5'>
              <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Email</label>
              <input className={inputCls} type='email' value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className='flex flex-col gap-0.5'>
              <div className='flex items-center justify-between'>
                <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Password</label>
                {!isSignUp && (
                  <Link
                    to='/forgot-password'
                    className='font-sans text-[9px] text-blue-400 hover:text-blue-600 uppercase tracking-widest transition-colors'
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <PasswordInput
                className={inputCls + (isSignUp && passShort ? ' border-red-300 focus:border-red-400' : '')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Min 8 chars' : ''}
                required
              />
              {isSignUp && passShort && (
                <p className='font-sans text-[8px] text-red-400 uppercase tracking-widest mt-0.5'>Minimum 8 characters</p>
              )}
            </div>

            {isSignUp && (
              <div className='flex flex-col gap-0.5'>
                <label className='uppercase tracking-[0.35em] text-[9px] text-blue-400 font-sans'>Confirm Password</label>
                <PasswordInput
                  className={
                    inputCls +
                    (passMismatch ? ' border-red-300 focus:border-red-400' : passMatch ? ' border-green-300 focus:border-green-400' : '')
                  }
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder='Repeat password'
                  required
                />
                {passMismatch && (
                  <p className='font-sans text-[8px] text-red-400 uppercase tracking-widest mt-0.5'>Passwords do not match</p>
                )}
                {passMatch && (
                  <p className='font-sans text-[8px] text-green-500 uppercase tracking-widest mt-0.5'>Match ✓</p>
                )}
              </div>
            )}

            <button
              type='submit'
              className='group relative overflow-hidden bg-blue-600 text-white mt-1 py-2.5 font-sans text-[12px] tracking-widest uppercase font-bold inline-flex items-center justify-center gap-2'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              <span className='relative z-10'>{isSignUp ? 'Create Account' : 'Login'}</span>
              <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>
              <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            </button>

          </form>

          <div className='mt-3.5'>
            <div className='relative flex items-center gap-2 mb-2.5'>
              <div className='flex-1 h-px bg-blue-100' />
              <span className='font-sans text-[9px] text-neutral-400 uppercase tracking-widest'>or continue with</span>
              <div className='flex-1 h-px bg-blue-100' />
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

          <div className='mt-3.5'>
            <div className='h-px bg-blue-100 mb-3' />
            <p className='font-sans text-sm text-neutral-400 text-center'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <span
                onClick={() => setState(isSignUp ? 'Login' : 'Sign Up')}
                className='text-blue-500 hover:text-light-blue-700 cursor-pointer ml-1.5 transition-colors'
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