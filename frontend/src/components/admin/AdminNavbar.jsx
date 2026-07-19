// frontend/src/components/admin/AdminNavbar.jsx
import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const AdminNavbar = () => {
  const { aToken, setAToken, backendUrl } = useContext(AdminContext)
  const navigate = useNavigate()

  const logout = async () => {
    try {
      await axios.post(
        `${backendUrl}/api/admin/logout`,
        {},
        { headers: { token: aToken } }
      )
    } catch (error) {
      console.error('Logout audit failed:', error)
    } finally {
      setAToken('')
      localStorage.removeItem('aToken')
      navigate('/secret-login')
    }
  }

  return (
    <div
      className='sticky top-0 z-50 bg-white border-b border-blue-100'
      style={{ height: '70px' }}
    >
      <div className='flex items-center justify-between h-full px-6'>

        {/* Left */}
        <div className='flex items-center gap-4'>
          <div className='w-1 bg-blue-600' style={{ height: '28px' }} />
          <div className='flex flex-col justify-center'>
            <span className='font-sans font-semibold uppercase tracking-[0.35em] text-[10px] text-blue-400'>
              Super Admin
            </span>
            <span className='font-sans font-black text-neutral-800 text-sm' style={{ letterSpacing: '-0.01em' }}>
              Dashboard Panel
            </span>
          </div>
        </div>

        {/* Right */}
        <button
          onClick={logout}
          className='group relative overflow-hidden border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
        >
          <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
          <svg className='w-3.5 h-3.5 relative z-10' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
          </svg>
          <span className='relative z-10 hidden sm:inline'>Logout</span>
        </button>

      </div>
    </div>
  )
}

export default AdminNavbar