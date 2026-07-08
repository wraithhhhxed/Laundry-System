import { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import { Search, LogIn, LogOut, User, Building2, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'

const ACTOR_CONFIG = {
  user:   { label: 'User',   icon: User,        border: 'border-blue-200 text-blue-600' },
  branch: { label: 'Branch', icon: Building2,   border: 'border-purple-200 text-purple-600' },
  admin:  { label: 'Admin',  icon: ShieldCheck, border: 'border-emerald-200 text-emerald-600' },
}

const ACTION_CONFIG = {
  login:  { label: 'Login',  icon: LogIn,  border: 'border-green-200 text-green-600' },
  logout: { label: 'Logout', icon: LogOut, border: 'border-red-200 text-red-500' },
}

const AuditLogs = () => {
  const { backendUrl, aToken } = useContext(AdminContext)
  const [logs, setLogs]             = useState([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [actorModel, setActorModel] = useState('')
  const [action, setAction]         = useState('')
  const [loading, setLoading]       = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search)     params.search     = search
      if (actorModel) params.actorModel = actorModel
      if (action)     params.action     = action

      const { data } = await axios.get(backendUrl + '/api/admin/audit-logs', {
        headers: { token: aToken },
        params,
      })
      if (data.success) {
        setLogs(data.data.logs)
        setTotal(data.data.total)
        setPages(data.data.pages)
      } else {
        toast.error(data.message)
      }
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page, actorModel, action])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLogs() }

  const formatDate = (d) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · ' + date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Violet Panel Header */}
      <div
        className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>
          System
        </p>
        <div className='flex items-center justify-between'>
          <h1
            className='font-sans font-black text-white'
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
          >
            Audit Logs
          </h1>
          <span className='font-sans text-xs font-semibold text-violet-200 uppercase tracking-[0.2em]'>
            {total} records
          </span>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Filters */}
        <div className='bg-white border border-violet-100 mb-6'>
          <div className='bg-violet-50 px-7 py-3 border-b border-violet-100'>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
              Filters
            </span>
          </div>
          <div className='px-7 py-4 flex flex-wrap gap-3 items-center'>

            {/* Search */}
            <form onSubmit={handleSearch} className='flex items-center gap-2 flex-1 min-w-[220px]'>
              <div className='relative flex-1'>
                <Search size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-violet-300' />
                <input
                  type='text'
                  placeholder='Search by name or email…'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='w-full pl-9 pr-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
                />
              </div>
              <button
                type='submit'
                className='group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center px-5 py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Search</span>
              </button>
            </form>

            {/* Role filter */}
            <select
              value={actorModel}
              onChange={e => { setActorModel(e.target.value); setPage(1) }}
              className='border border-violet-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-violet-400 transition-colors bg-white'
            >
              <option value=''>All Roles</option>
              <option value='user'>Users</option>
              <option value='branch'>Branches</option>
              <option value='admin'>Admins</option>
            </select>

            {/* Action filter */}
            <select
              value={action}
              onChange={e => { setAction(e.target.value); setPage(1) }}
              className='border border-violet-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-violet-400 transition-colors bg-white'
            >
              <option value=''>All Actions</option>
              <option value='login'>Login</option>
              <option value='logout'>Logout</option>
            </select>

          </div>
        </div>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden mb-4'>

          {/* Table Header */}
          <div className='grid grid-cols-[1.6fr_0.8fr_0.8fr_1fr_1.2fr] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['Account', 'Role', 'Action', 'IP Address', 'Date & Time'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300 uppercase tracking-[0.2em]'>
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              No logs found
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {logs.map(log => {
                const actor    = ACTOR_CONFIG[log.actorModel] || {}
                const act      = ACTION_CONFIG[log.action]    || {}
                const ActorIcon = actor.icon || User
                const ActIcon   = act.icon   || LogIn
                return (
                  <div
                    key={log._id}
                    className='grid grid-cols-[1.6fr_0.8fr_0.8fr_1fr_1.2fr] items-center px-7 py-4 hover:bg-violet-50 transition-colors'
                  >
                    {/* Account */}
                    <div>
                      <p className='font-sans font-black text-sm text-neutral-700'>
                        {log.actorName || '—'}
                      </p>
                      <p className='font-sans text-xs text-neutral-400'>{log.actorEmail || '—'}</p>
                    </div>

                    {/* Role */}
                    <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 w-fit inline-flex items-center gap-1 ${actor.border || 'border-neutral-200 text-neutral-400'}`}>
                      <ActorIcon size={9} />{actor.label || log.actorModel}
                    </span>

                    {/* Action */}
                    <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 w-fit inline-flex items-center gap-1 ${act.border || 'border-neutral-200 text-neutral-400'}`}>
                      <ActIcon size={9} />{act.label || log.action}
                    </span>

                    {/* IP */}
                    <span className='font-mono text-xs text-neutral-500'>
                      {log.ip || '—'}
                    </span>

                    {/* Date */}
                    <span className='font-sans text-xs text-neutral-500'>
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className='flex items-center justify-between px-7 py-3 border-t border-violet-100 bg-violet-50'>
              <span className='font-sans text-[10px] uppercase tracking-[0.2em] text-violet-400'>
                Page {page} of {pages}
              </span>
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-1.5 text-violet-400 hover:text-violet-700 disabled:opacity-20 transition-colors'
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i
                  if (p < 1 || p > pages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 font-sans text-xs font-bold transition-colors ${
                        p === page
                          ? 'bg-violet-600 text-white'
                          : 'text-violet-400 hover:text-violet-700'
                      }`}
                      style={p === page ? { clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' } : {}}
                    >
                      {p}
                    </button>
                  )
                })}

                <button
                  onClick={() => setPage(p => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className='p-1.5 text-violet-400 hover:text-violet-700 disabled:opacity-20 transition-colors'
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditLogs