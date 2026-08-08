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
  'w-full px-0 py-3.5 border-b-2 border-blue-200 font-sans text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-600 transition-all duration-300 bg-transparent'

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
        className='absolute right-0 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 transition-colors focus:outline-none'
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
        const payload = { name, email, password, phone, address: JSON.stringify(address) }
        const { data } = await axios.post(backendUrl + '/api/user/register', payload)
        if (data.success) {
          toast.success('Account created! Please log in.')
          setName(''); setEmail(''); setPassword(''); setConfirmPass(''); setPhone('')
          setAddress({ line1: '', line2: '' })
          setState('Login')
        } else {
          toast.error(data.message)
        }
        return
      }

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
    <div style={{ fontFamily: "'Georgia', serif" }} className='min-h-screen flex bg-white'>

      {/* Left Panel - Dynamic Blue with Pattern */}
      <div className='hidden lg:flex w-[45%] bg-blue-600 flex-col justify-center px-16 relative overflow-hidden'>
        {/* Background patterns */}
        <div className='absolute inset-0' style={{ 
          background: 'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)' 
        }} />
        <div className='absolute inset-0 opacity-5' style={{ 
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 2px, transparent 2px, transparent 30px)'
        }} />
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-white/5 rotate-45' />
        <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rotate-45' />
        
        <div className='relative z-10'>
          {/* Logo - original colors */}
          <img src={assets.logo} alt='Selfie Wash' className='w-52 mb-16' />
          
          <div className='border-l-4 border-white/30 pl-8'>
            <p className='text-white/40 font-sans text-xs uppercase tracking-[0.4em] mb-4'>
              {isSignUp ? 'Get started' : 'Welcome back'}
            </p>
            <h1 className='text-white leading-[1.1] text-5xl font-bold mb-4'>
              {isSignUp ? 'Fresh clothes.' : 'Good to see'}
              <br />
              {isSignUp ? 'Zero hassle.' : 'you again.'}
            </h1>
            <p className='text-white/50 font-sans text-sm leading-relaxed max-w-sm'>
              {isSignUp 
                ? 'Create your account and experience the easiest way to get your laundry done.'
                : 'Access your appointments, track your laundry, and manage your preferences.'}
            </p>
          </div>

          <div className='grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/10'>
            {['Pickup', 'Wash', 'Deliver'].map((label, i) => (
              <div key={label} className='group'>
                <p className='text-white/30 font-sans text-sm font-bold tracking-widest group-hover:text-white/60 transition-colors'>
                  0{i+1}
                </p>
                <p className='text-white/50 font-sans text-[10px] uppercase tracking-[0.3em] group-hover:text-white/70 transition-colors'>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className='flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-b from-white to-blue-50/30'>
        <div className='w-full max-w-sm'>

          <div className='mb-10'>
            <h2 className='text-4xl font-bold text-blue-900 mb-2 tracking-tight'>
              {isSignUp ? 'Create your account.' : 'Log in.'}
            </h2>
            <p className='text-gray-500 font-sans text-sm'>
              {isSignUp ? 'Start your laundry journey with us.' : 'Welcome back to Selfie Wash.'}
            </p>
          </div>

          <form onSubmit={onSubmitHandler} className='space-y-6'>

            {isSignUp && (
              <>
                <div className='group'>
                  <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans block mb-2 group-focus-within:text-blue-700 transition-colors'>
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
                  <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans block mb-2 group-focus-within:text-blue-700 transition-colors'>
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
                    <p className='text-red-400 font-sans text-[9px] uppercase tracking-widest mt-2'>
                      Must be 11 digits starting with 09
                    </p>
                  )}
                </div>

                <div className='flex gap-4'>
                  <div className='flex-1 group'>
                    <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans block mb-2 group-focus-within:text-blue-700 transition-colors'>
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
                    <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans block mb-2 group-focus-within:text-blue-700 transition-colors'>
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
              <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans block mb-2 group-focus-within:text-blue-700 transition-colors'>
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
                <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans group-focus-within:text-blue-700 transition-colors'>
                  Password
                </label>
                {!isSignUp && (
                  <Link
                    to='/forgot-password'
                    className='text-[10px] text-blue-400 hover:text-blue-600 font-sans uppercase tracking-widest transition-colors'
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
                <p className='text-red-400 font-sans text-[9px] uppercase tracking-widest mt-2'>
                  Minimum 8 characters
                </p>
              )}
            </div>

            {isSignUp && (
              <div className='group'>
                <label className='text-[10px] uppercase tracking-[0.3em] text-blue-500 font-sans block mb-2 group-focus-within:text-blue-700 transition-colors'>
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
                  <p className='text-red-400 font-sans text-[9px] uppercase tracking-widest mt-2'>
                    Passwords do not match
                  </p>
                )}
                {passMatch && (
                  <p className='text-green-500 font-sans text-[9px] uppercase tracking-widest mt-2'>
                    Match confirmed
                  </p>
                )}
              </div>
            )}

            <button
              type='submit'
              className='w-full bg-blue-600 text-white py-4 font-sans text-xs tracking-[0.3em] uppercase font-bold hover:bg-blue-700 transition-all duration-300 relative overflow-hidden group'
            >
              <span className='relative z-10'>{isSignUp ? 'Create account' : 'Log in'}</span>
              <span className='relative z-10 inline-block ml-3 group-hover:translate-x-1 transition-transform duration-300'>→</span>
              <div className='absolute inset-0 bg-blue-700 translate-x-full group-hover:translate-x-0 transition-transform duration-500' />
            </button>

          </form>

          <div className='mt-8'>
            <div className='flex items-center gap-4 mb-5'>
              <div className='flex-1 h-px bg-blue-200' />
              <span className='text-gray-400 font-sans text-[9px] uppercase tracking-[0.3em]'>
                Or continue with
              </span>
              <div className='flex-1 h-px bg-blue-200' />
            </div>
            
            <div className='flex justify-center transform hover:scale-[1.02] transition-transform duration-300'>
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

          <div className='mt-8 pt-6 border-t-2 border-blue-100'>
            <p className='text-center text-sm text-gray-500 font-sans'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                type='button'
                onClick={() => setState(isSignUp ? 'Login' : 'Sign Up')}
                className='text-blue-600 font-bold ml-2 hover:text-blue-700 transition-colors hover:underline'
              >
                {isSignUp ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Login