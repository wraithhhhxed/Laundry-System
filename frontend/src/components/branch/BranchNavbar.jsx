import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { BranchesContext } from '../../context/BranchesContext'

const BranchNavbar = () => {
  const { bToken, logoutBranch, branchProfile } = useContext(BranchesContext)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logoutBranch()
    navigate('/secret-login')
  }

  if (!bToken) return null

  return (
    <div
      className="sticky top-0 z-50 bg-white border-b border-violet-100"
      style={{ height: '70px' }}
    >
      <div className="flex items-center justify-between h-full px-6">

        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="w-1 bg-violet-600" style={{ height: '28px' }} />
          <div className="flex flex-col justify-center">
            <span className="font-sans font-semibold uppercase tracking-[0.35em] text-[10px] text-violet-400">
              Branch Portal
            </span>
            <span
              className="font-sans font-black text-neutral-800 text-sm"
              style={{ letterSpacing: '-0.01em' }}
            >
              {branchProfile?.name || 'Branch'}
            </span>
          </div>
        </div>

        {/* Right */}
        <button
          onClick={handleLogout}
          className="group relative overflow-hidden border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5"
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
        >
          <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
          <svg className="w-3.5 h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="relative z-10 hidden sm:inline">Logout</span>
        </button>

      </div>
    </div>
  )
}

export default BranchNavbar