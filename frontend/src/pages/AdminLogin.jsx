import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const EyeIcon = ({ show }) => show ? (
  <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
    <path strokeLinecap='round' strokeLinejoin='round' d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21' />
  </svg>
) : (
  <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
    <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
    <path strokeLinecap='round' strokeLinejoin='round' d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
  </svg>
)

const AdminLogin = () => {
  const { setAToken, backendUrl } = useContext(AdminContext)
  const navigate                  = useNavigate()

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post(backendUrl + '/api/admin/login', { email, password })
      if (data.success) {
        localStorage.setItem('aToken', data.data.token)
        setAToken(data.data.token)
        toast.success('Welcome back, Admin!')
        navigate('/admin/dashboard')
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='min-h-screen bg-white flex items-center justify-center px-4'>
      <div className='w-full max-w-sm'>

        {/* header */}
        <div className='mb-8'>
          <span className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans block mb-3'>
            Selfie Wash · Internal Access
          </span>
          <div className='h-px bg-violet-100 mb-6' />
          <h1
            className='leading-none text-violet-900'
            style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            Super Admin.
          </h1>
        </div>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>

          <div className='flex flex-col gap-1.5'>
            <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>
              Email
            </label>
            <input
              type='email'
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='admin@selfiewash.com'
              className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans'>
              Password
            </label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='Enter your password'
                className='w-full px-4 py-2.5 pr-10 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors'
              />
              <button
                type='button'
                onClick={() => setShowPassword(p => !p)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 hover:text-violet-500 transition-colors'
              >
                <EyeIcon show={showPassword} />
              </button>
            </div>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='group relative overflow-hidden bg-violet-600 text-white mt-2 py-3 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-3 disabled:opacity-60'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <span className='relative z-10'>{loading ? 'Signing in...' : 'Login'}</span>
            {!loading && (
              <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>
            )}
            <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
          </button>

        </form>

      </div>
    </div>
  )
}

export default AdminLogin