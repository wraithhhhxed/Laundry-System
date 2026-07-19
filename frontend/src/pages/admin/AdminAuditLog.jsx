import { useState, useEffect, useCallback, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminContext } from '../../context/AdminContext'
import {
  Search, ChevronLeft, ChevronRight,
  ClipboardList, RefreshCw, Scale, CreditCard, XCircle,
  LogIn, LogOut, AlertTriangle, Settings, Package,
  PlusSquare, Trash2, Store, User, ShieldCheck
} from 'lucide-react'

const LOGIN_ACTIONS = ['USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT']

const ACTION_META = {
  APPOINTMENT_CREATED:          { label: 'Appointment Created',   Icon: ClipboardList,  border: 'border-emerald-200 text-emerald-700' },
  APPOINTMENT_STATUS_CHANGED:   { label: 'Status Changed',        Icon: RefreshCw,      border: 'border-blue-200 text-blue-700' },
  APPOINTMENT_WEIGHT_CONFIRMED: { label: 'Weight Confirmed',      Icon: Scale,          border: 'border-violet-200 text-violet-700' },
  APPOINTMENT_PAYMENT_UPDATED:  { label: 'Payment Updated',       Icon: CreditCard,     border: 'border-amber-200 text-amber-700' },
  APPOINTMENT_CANCELLED:        { label: 'Cancelled',             Icon: XCircle,        border: 'border-red-200 text-red-600' },
  USER_LOGIN:                   { label: 'Login',                 Icon: LogIn,          border: 'border-green-200 text-green-600' },
  USER_LOGIN_FAILED:            { label: 'Login Failed',          Icon: AlertTriangle,  border: 'border-red-200 text-red-600' },
  USER_LOGOUT:                  { label: 'Logout',                Icon: LogOut,         border: 'border-neutral-200 text-neutral-500' },
  SETTING_CHANGED:              { label: 'Setting Changed',       Icon: Settings,       border: 'border-orange-200 text-orange-700' },
  INVENTORY_UPDATED:            { label: 'Inventory Updated',     Icon: Package,        border: 'border-cyan-200 text-cyan-700' },
  INVENTORY_CREATED:            { label: 'Inventory Created',     Icon: PlusSquare,     border: 'border-emerald-200 text-emerald-700' },
  INVENTORY_DELETED:            { label: 'Inventory Deleted',     Icon: Trash2,         border: 'border-red-200 text-red-600' },
  BRANCH_CREATED:               { label: 'Branch Created',        Icon: Store,          border: 'border-emerald-200 text-emerald-700' },
  BRANCH_UPDATED:               { label: 'Branch Updated',        Icon: Store,          border: 'border-blue-200 text-blue-700' },
  USER_CREATED:                 { label: 'User Created',          Icon: User,           border: 'border-emerald-200 text-emerald-700' },
  USER_UPDATED:                 { label: 'User Updated',          Icon: User,           border: 'border-blue-200 text-blue-700' },
  USER_DELETED:                 { label: 'User Deleted',          Icon: User,           border: 'border-red-200 text-red-600' },
}

const ROLE_META = {
  superadmin:  { label: 'Admin',  Icon: ShieldCheck, border: 'border-emerald-200 text-emerald-600' },
  branchadmin: { label: 'Branch', Icon: Store,       border: 'border-blue-200 text-blue-600' },
  staff:       { label: 'Staff',  Icon: User,        border: 'border-blue-200 text-blue-600' },
  client:      { label: 'User',   Icon: User,        border: 'border-blue-200 text-blue-500' },
  system:      { label: 'System', Icon: Settings,    border: 'border-neutral-200 text-neutral-500' },
  unknown:     { label: '?',      Icon: User,        border: 'border-red-200 text-red-500' },
}

const ALL_ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'APPOINTMENT_CREATED',          label: 'Appointment Created' },
  { value: 'APPOINTMENT_STATUS_CHANGED',   label: 'Status Changed' },
  { value: 'APPOINTMENT_WEIGHT_CONFIRMED', label: 'Weight Confirmed' },
  { value: 'APPOINTMENT_PAYMENT_UPDATED',  label: 'Payment Updated' },
  { value: 'APPOINTMENT_CANCELLED',        label: 'Appointment Cancelled' },
  { value: 'USER_LOGIN',                   label: 'Login' },
  { value: 'USER_LOGIN_FAILED',            label: 'Login Failed' },
  { value: 'USER_LOGOUT',                  label: 'Logout' },
  { value: 'SETTING_CHANGED',              label: 'Setting Changed' },
  { value: 'INVENTORY_UPDATED',            label: 'Inventory Updated' },
  { value: 'INVENTORY_CREATED',            label: 'Inventory Created' },
  { value: 'INVENTORY_DELETED',            label: 'Inventory Deleted' },
  { value: 'BRANCH_CREATED',               label: 'Branch Created' },
  { value: 'BRANCH_UPDATED',               label: 'Branch Updated' },
  { value: 'USER_CREATED',                 label: 'User Created' },
  { value: 'USER_UPDATED',                 label: 'User Updated' },
  { value: 'USER_DELETED',                 label: 'User Deleted' },
]

const LOGIN_ACTION_OPTIONS = [
  { value: '', label: 'All Login Events' },
  { value: 'USER_LOGIN',        label: 'Login' },
  { value: 'USER_LOGIN_FAILED', label: 'Login Failed' },
  { value: 'USER_LOGOUT',       label: 'Logout' },
]

const makePreset = (isLoginHistory) =>
  isLoginHistory
    ? { action: '', actorName: '', actorRole: '', targetType: '', dateFrom: '', dateTo: '', page: 1, limit: 20 }
    : { action: '', actorName: '', actorRole: '', targetType: '', dateFrom: '', dateTo: '', page: 1, limit: 20 }

const describeLog = (log) => {
  const actor  = log.actor?.name ?? 'Someone'
  const target = log.target?.label ?? log.target?.id ?? ''
  switch (log.action) {
    case 'APPOINTMENT_CREATED':          return `${actor} booked appointment ${target}`
    case 'APPOINTMENT_STATUS_CHANGED':   return `${actor} moved ${target} from "${log.before?.deliveryStatus}" to "${log.after?.deliveryStatus}"`
    case 'APPOINTMENT_WEIGHT_CONFIRMED': return `${actor} confirmed weight for ${target}`
    case 'APPOINTMENT_PAYMENT_UPDATED':  return `${actor} recorded ${log.after?.paymentMethod ?? '—'} payment for ${target}`
    case 'APPOINTMENT_CANCELLED':        return `${actor} cancelled ${target}${log.meta?.reason ? ` — "${log.meta.reason}"` : ''}`
    case 'USER_LOGIN':                   return `${actor} logged in`
    case 'USER_LOGIN_FAILED':            return `Failed login attempt for ${target}`
    case 'USER_LOGOUT':                  return `${actor} logged out`
    case 'SETTING_CHANGED':              return `${actor} updated "${log.target?.label}"`
    case 'INVENTORY_UPDATED':            return `${actor} updated stock for "${target}" — ${log.before?.quantity ?? '?'} to ${log.after?.quantity ?? '?'}`
    case 'INVENTORY_CREATED':            return `${actor} added "${target}" to inventory`
    case 'INVENTORY_DELETED':            return `${actor} removed "${target}" from inventory`
    case 'BRANCH_CREATED':               return `${actor} created branch "${target}"`
    case 'BRANCH_UPDATED':               return `${actor} updated branch "${target}"`
    case 'USER_CREATED':                 return `${actor} created user "${target}"`
    case 'USER_UPDATED':                 return `${actor} updated user "${target}"`
    case 'USER_DELETED':                 return `${actor} deleted user "${target}"`
    default:                             return `${actor} performed ${log.action}`
  }
}

const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ log, onClose }) => {
  if (!log) return null
  const meta = ACTION_META[log.action] ?? { label: log.action, Icon: ClipboardList, border: 'border-neutral-200 text-neutral-500' }
  const { Icon } = meta
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white border border-blue-100 w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-blue-100"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={14} className="text-blue-200" />
              <span className="font-sans font-bold text-white text-sm">{meta.label}</span>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white font-sans text-lg leading-none">✕</button>
          </div>
          <p className="font-sans text-[10px] text-blue-300 uppercase tracking-[0.2em] mt-1">{formatDate(log.createdAt)}</p>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 text-sm">
          <p className="font-sans text-neutral-700 leading-relaxed">{describeLog(log)}</p>
          <div>
            <p className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400 mb-1.5">Actor</p>
            <div className="flex items-center gap-2">
              <span className="font-sans font-black text-sm text-neutral-700">{log.actor?.name ?? '—'}</span>
              {(() => {
                const r = ROLE_META[log.actor?.role] ?? { label: log.actor?.role ?? '—', Icon: User, border: 'border-neutral-200 text-neutral-400' }
                return (
                  <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 inline-flex items-center gap-1 ${r.border}`}>
                    <r.Icon size={9} />{r.label}
                  </span>
                )
              })()}
            </div>
            {log.actor?.email && (
              <p className="font-sans text-xs text-neutral-400 mt-1">{log.actor.email}</p>
            )}
          </div>
          {log.target?.label && (
            <div>
              <p className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400 mb-1.5">Target</p>
              <p className="font-sans text-neutral-700">
                {log.target.type && <span className="text-neutral-400">{log.target.type} / </span>}
                {log.target.label}
              </p>
            </div>
          )}
          {(log.before || log.after) && (
            <div className="grid grid-cols-2 gap-3">
              {log.before && (
                <div>
                  <p className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400 mb-1.5">Before</p>
                  <pre className="bg-red-50 border border-red-100 text-red-700 p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.after && (
                <div>
                  <p className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400 mb-1.5">After</p>
                  <pre className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          {log.meta && Object.keys(log.meta).length > 0 && (
            <div>
              <p className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400 mb-1.5">Meta</p>
              <pre className="bg-neutral-50 border border-neutral-100 text-neutral-600 p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminAuditLog = () => {
  const { getAuditLogs } = useContext(AdminContext)
  const location = useLocation()

  const isLoginHistory = location.pathname === '/admin/login-history'
  const pageTitle      = isLoginHistory ? 'Login History' : 'Audit Log'

  const [logs, setLogs]                 = useState([])
  const [total, setTotal]               = useState(0)
  const [totalPages, setTotalPages]     = useState(1)
  const [loading, setLoading]           = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedLog, setSelectedLog]   = useState(null)
  const [filters, setFilters]           = useState(() => makePreset(isLoginHistory))
  const [searchInput, setSearchInput]   = useState('')
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [secondsAgo, setSecondsAgo]     = useState(0)

  // Reset filters whenever route switches between audit-log ↔ login-history
  useEffect(() => {
    setFilters(makePreset(isLoginHistory))
    setSearchInput('')
  }, [isLoginHistory])

  useEffect(() => {
    if (!lastUpdated) return
    const tick = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)), 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  const lastUpdatedLabel = lastUpdated
    ? secondsAgo < 5 ? 'Just now' : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`
    : '—'

  const fetchLogs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    else setLoading(true)

    // For login history: if no specific action selected, send all 3 login action
    // types as a comma-separated list so the backend filters correctly.
    // This means pagination + total count are accurate (no more frontend slicing).
    const query = { ...filters }
    if (isLoginHistory && !query.action) {
      query.action = LOGIN_ACTIONS.join(',')
    }

    const result = await getAuditLogs(query)
    if (result) {
      // Safety net: strip ghost records (old logs with no real actor name)
      const cleanLogs = result.logs.filter(l => l.actor?.name && l.actor.name !== 'System')
      setLogs(cleanLogs)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setLastUpdated(new Date())
      setSecondsAgo(0)
    }
    setLoading(false)
    setIsRefreshing(false)
  }, [filters, getAuditLogs, isLoginHistory])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleRefresh = () => fetchLogs(true)

  const setFilter = (key, value) =>
    setFilters(f => ({ ...f, [key]: value, page: key !== 'page' ? 1 : value }))

  const handleSearch = (e) => {
    e.preventDefault()
    setFilters(f => ({ ...f, actorName: searchInput, page: 1 }))
  }

  const clearFilters = () => {
    setFilters(makePreset(isLoginHistory))
    setSearchInput('')
  }

  const hasActiveFilters = filters.action || filters.actorName ||
    (!isLoginHistory && filters.actorRole) ||
    (!isLoginHistory && filters.targetType) ||
    filters.dateFrom || filters.dateTo

  const actionOptions = isLoginHistory ? LOGIN_ACTION_OPTIONS : ALL_ACTION_OPTIONS

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-white">

      {/* ── Header ── */}
      <div className="px-10 pt-10 pb-12"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-3">Settings</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white"
              style={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>
              {pageTitle}
            </h1>
            <p className="font-sans text-sm text-blue-300 mt-2">
              {isLoginHistory ? 'Login, logout, and failed login attempts' : 'Full trail of all system actions'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="font-sans text-[10px] uppercase tracking-widest text-blue-300">Last updated</p>
              <p className="font-sans text-xs text-white font-semibold">{lastUpdatedLabel}</p>
            </div>
            <button onClick={handleRefresh} disabled={isRefreshing}
              className="group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              <span className={`relative z-10 inline-block ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
              <span className="relative z-10">{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-10 py-10 max-w-7xl mx-auto">

        {/* ── Section label ── */}
        <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2">
          {isLoginHistory ? 'Filter Login Events' : 'Filter Audit Logs'}
        </p>
        <div className="h-px bg-blue-100 mb-6" />

        {/* ── Filters ── */}
        <div className="bg-white border border-blue-100 mb-8">
          <div className="bg-blue-50 px-7 py-3 border-b border-blue-100">
            <span className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400">Filters</span>
          </div>
          <div className="px-7 py-4 flex flex-wrap gap-3 items-end">

            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" />
                <input type="text" placeholder="Search by name…" value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white" />
              </div>
              <button type="submit"
                className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center px-5 py-2.5"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">Search</span>
              </button>
            </form>

            {/* Action */}
            <div className="flex flex-col gap-1">
              <span className="uppercase tracking-[0.2em] text-[9px] font-sans font-semibold text-blue-400">
                {isLoginHistory ? 'Event' : 'Action'}
              </span>
              <select value={filters.action} onChange={e => setFilter('action', e.target.value)}
                className="border border-blue-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Role — audit log only */}
            {!isLoginHistory && (
              <div className="flex flex-col gap-1">
                <span className="uppercase tracking-[0.2em] text-[9px] font-sans font-semibold text-blue-400">Role</span>
                <select value={filters.actorRole} onChange={e => setFilter('actorRole', e.target.value)}
                  className="border border-blue-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                  <option value="">All Roles</option>
                  <option value="superadmin">Admin</option>
                  <option value="branchadmin">Branch</option>
                  <option value="client">User</option>
                </select>
              </div>
            )}

            {/* Target — audit log only */}
            {!isLoginHistory && (
              <div className="flex flex-col gap-1">
                <span className="uppercase tracking-[0.2em] text-[9px] font-sans font-semibold text-blue-400">Target</span>
                <select value={filters.targetType} onChange={e => setFilter('targetType', e.target.value)}
                  className="border border-blue-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-blue-400 transition-colors bg-white">
                  <option value="">All Types</option>
                  <option value="Appointment">Appointment</option>
                  <option value="User">User</option>
                  <option value="Setting">Setting</option>
                  <option value="Inventory">Inventory</option>
                  <option value="Branch">Branch</option>
                </select>
              </div>
            )}

            {/* Date From */}
            <div className="flex flex-col gap-1">
              <span className="uppercase tracking-[0.2em] text-[9px] font-sans font-semibold text-blue-400">Date From</span>
              <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)}
                className="border border-blue-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-blue-400 transition-colors bg-white" />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1">
              <span className="uppercase tracking-[0.2em] text-[9px] font-sans font-semibold text-blue-400">Date To</span>
              <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)}
                className="border border-blue-100 px-3 py-2.5 font-sans text-sm text-neutral-600 focus:outline-none focus:border-blue-400 transition-colors bg-white" />
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="font-sans text-xs text-blue-400 hover:text-blue-700 underline transition-colors self-end pb-2.5">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Results count ── */}
        <div className="flex items-center justify-between mb-6">
          <p className="font-sans text-xs text-neutral-400">
            Showing <span className="text-blue-600 font-semibold">{total}</span> {total === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-blue-100 overflow-hidden">

          {/* Header row */}
          <div className={`grid bg-blue-50 px-7 py-3 border-b border-blue-100 ${
            isLoginHistory
              ? 'grid-cols-[2fr_0.7fr_0.7fr_1.2fr]'
              : 'grid-cols-[2fr_1fr_0.8fr_1fr_1.2fr]'
          }`}>
            {(isLoginHistory
              ? ['Account', 'Role', 'Action', 'Date & Time']
              : ['Description', 'Actor', 'Action', 'Target', 'Date & Time']
            ).map(h => (
              <span key={h} className="uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400">{h}</span>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center font-sans text-sm text-neutral-300 uppercase tracking-[0.2em]">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center font-sans text-sm text-neutral-300 uppercase tracking-[0.2em]">No logs found</div>
          ) : (
            <div className="divide-y divide-blue-50">
              {logs.map(log => {
                const actionMeta = ACTION_META[log.action] ?? { label: log.action, Icon: ClipboardList, border: 'border-neutral-200 text-neutral-400' }
                const roleMeta   = ROLE_META[log.actor?.role] ?? { label: log.actor?.role ?? '—', Icon: User, border: 'border-neutral-200 text-neutral-400' }
                const { Icon: ActionIcon } = actionMeta
                const { Icon: RoleIcon   } = roleMeta

                return (
                  <div key={log.id} onClick={() => setSelectedLog(log)}
                    className={`grid items-center px-7 py-4 hover:bg-blue-50 transition-colors cursor-pointer ${
                      isLoginHistory
                        ? 'grid-cols-[2fr_0.7fr_0.7fr_1.2fr]'
                        : 'grid-cols-[2fr_1fr_0.8fr_1fr_1.2fr]'
                    }`}>

                    {isLoginHistory ? (
                      <>
                        {/* Account */}
                        <div>
                          <p className="font-sans font-black text-sm text-neutral-700">{log.actor?.name ?? '—'}</p>
                          <p className="font-sans text-xs text-neutral-400 mt-0.5">{log.actor?.email ?? ''}</p>
                        </div>
                        {/* Role */}
                        <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 w-fit inline-flex items-center gap-1 ${roleMeta.border}`}>
                          <RoleIcon size={9} />{roleMeta.label}
                        </span>
                        {/* Action */}
                        <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 w-fit inline-flex items-center gap-1 ${actionMeta.border}`}>
                          <ActionIcon size={9} />{actionMeta.label}
                        </span>
                        {/* Date */}
                        <span className="font-sans text-xs text-neutral-500">{formatDate(log.createdAt)}</span>
                      </>
                    ) : (
                      <>
                        {/* Description */}
                        <div className="pr-4 min-w-0">
                          <p className="font-sans text-sm text-neutral-700 leading-snug line-clamp-2">{describeLog(log)}</p>
                        </div>
                        {/* Actor */}
                        <div>
                          <p className="font-sans font-black text-sm text-neutral-700">{log.actor?.name ?? '—'}</p>
                          <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 inline-flex items-center gap-1 mt-1 ${roleMeta.border}`}>
                            <RoleIcon size={9} />{roleMeta.label}
                          </span>
                        </div>
                        {/* Action */}
                        <span className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-1 w-fit inline-flex items-center gap-1 ${actionMeta.border}`}>
                          <ActionIcon size={9} />{actionMeta.label}
                        </span>
                        {/* Target */}
                        <div className="min-w-0">
                          <p className="font-sans text-[10px] text-neutral-400 uppercase tracking-wider">{log.target?.type ?? '—'}</p>
                          <p className="font-sans text-xs text-neutral-700 font-semibold truncate mt-0.5">{log.target?.label ?? '—'}</p>
                        </div>
                        {/* Date */}
                        <span className="font-sans text-xs text-neutral-500">{formatDate(log.createdAt)}</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-7 py-3 border-t border-blue-100 bg-blue-50">
              <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-blue-400">
                Page {filters.page} of {totalPages} · {total} records
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setFilter('page', Math.max(1, filters.page - 1))}
                  disabled={filters.page === 1}
                  className="p-1.5 text-blue-400 hover:text-blue-700 disabled:opacity-20 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = filters.page <= 3 ? i + 1 : filters.page - 2 + i
                  if (p < 1 || p > totalPages) return null
                  return (
                    <button key={p} onClick={() => setFilter('page', p)}
                      className={`w-7 h-7 font-sans text-xs font-bold transition-colors ${
                        p === filters.page ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-700'
                      }`}
                      style={p === filters.page ? { clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' } : {}}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setFilter('page', Math.min(totalPages, filters.page + 1))}
                  disabled={filters.page === totalPages}
                  className="p-1.5 text-blue-400 hover:text-blue-700 disabled:opacity-20 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}

export default AdminAuditLog