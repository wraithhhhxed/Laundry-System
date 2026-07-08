import { useEffect, useContext } from 'react'
import { BranchesContext } from '../../context/BranchesContext'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis,
  ResponsiveContainer, Legend,
} from 'recharts'

const PRIMARY    = '#7c3aed'
const BAR_COLORS = ['#7c3aed','#8b5cf6','#a78bfa','#c4b5fd','#6d28d9','#5b21b6']
const COLORS     = { completed: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444' }

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans mb-2 font-semibold">{children}</p>
)
const Divider = () => <div className="h-px bg-violet-100 mb-6" />

/* ── Animated counter pill ── */
const MiniTrendBadge = ({ value, positive = true }) => (
  <span className={`inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 border ${
    positive
      ? 'border-green-200 bg-green-50 text-green-600'
      : 'border-red-200 bg-red-50 text-red-500'
  }`}>
    {positive ? '↑' : '↓'} {value}
  </span>
)

const StatCard = ({ label, value, sub, icon, accent }) => (
  <div
    className="relative overflow-hidden px-8 py-9 flex flex-col gap-3 group"
    style={{
      background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.14) 0%, transparent 55%), #7c3aed',
      clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
    }}
  >
    <div className="absolute top-0 right-0 w-16 h-16 opacity-10"
      style={{ background: 'radial-gradient(circle at top right, white, transparent)' }} />
    <div className="absolute bottom-0 left-0 w-24 h-24 opacity-5"
      style={{ background: 'radial-gradient(circle, white, transparent)' }} />

    <div className="flex items-center justify-between">
      <p className="uppercase tracking-[0.35em] text-[9px] text-violet-200 font-sans font-bold">{label}</p>
    </div>

    <p
      className="text-white font-sans font-black leading-none"
      style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', letterSpacing: '-0.04em' }}
    >
      {value}
    </p>

    <div className="flex items-center gap-2 mt-1">
      {sub && <p className="font-sans text-[10px] text-violet-200 uppercase tracking-widest font-medium">{sub}</p>}
    </div>

    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 group-hover:bg-white/25 transition-all duration-500" />
  </div>
)

const StatusChip = ({ appt }) => {
  if (appt.cancelled)
    return <span className="inline-block border border-red-300 bg-red-50 text-red-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[9px] font-sans font-bold">Cancelled</span>
  if (appt.isCompleted)
    return <span className="inline-block border border-green-300 bg-green-50 text-green-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[9px] font-sans font-bold">Completed</span>
  return <span className="inline-block border border-amber-300 bg-amber-50 text-amber-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[9px] font-sans font-bold">Pending</span>
}

const EarningsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-violet-200 px-4 py-3 font-sans text-xs shadow-lg"
      style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
      <p className="uppercase tracking-[0.2em] text-violet-400 mb-1 font-semibold text-[10px]">{label}</p>
      <p className="font-black text-violet-900 text-base">₱{payload[0].value.toLocaleString()}</p>
    </div>
  )
}

const VRule = () => <div className="hidden lg:block w-px bg-violet-100 self-stretch mx-1" />

const BranchDashboard = () => {
  const { bToken, dashData, getBranchDashboard, branchProfile, getBranchProfile } = useContext(BranchesContext)

  useEffect(() => {
    if (bToken) { getBranchDashboard(); getBranchProfile() }
  }, [bToken])

  if (!dashData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent animate-spin" />
        <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-violet-300 font-bold">Loading dashboard…</p>
      </div>
    )
  }

  const {
    totalEarnings                    = 0,
    totalAppointments                = 0,
    statusCounts                     = { completed: 0, pending: 0, cancelled: 0 },
    appointmentsByService: rawByService = [],
    earningsByMonth                  = [],
    latestAppointments               = [],
  } = dashData

  // Filter out entries with null/undefined/empty names (deleted services)
  const appointmentsByService = rawByService.filter(
    item => item.name && item.name.trim() !== '' && item.name.toLowerCase() !== 'unknown'
  )

  const donutData = [
    { name: 'Completed', value: statusCounts.completed || 0 },
    { name: 'Pending',   value: statusCounts.pending   || 0 },
    { name: 'Cancelled', value: statusCounts.cancelled || 0 },
  ]

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const completionRate = totalAppointments > 0
    ? Math.round((statusCounts.completed / totalAppointments) * 100)
    : 0

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-neutral-50">

      {/* ── HERO HEADER ── */}
      <div
        className="relative overflow-hidden px-10 pt-12 pb-14"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />

        <div className="absolute right-10 top-1/2 -translate-y-1/2 font-sans font-black text-white opacity-[0.04] select-none pointer-events-none"
          style={{ fontSize: 'clamp(8rem, 18vw, 14rem)', lineHeight: 1, letterSpacing: '-0.06em' }}>
          {new Date().getFullYear()}
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1
                className="text-white font-sans font-black mb-2 leading-none"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em' }}
              >
                {branchProfile?.name || 'Dashboard'}
              </h1>
              <p className="font-sans text-[10px] text-violet-300 uppercase tracking-[0.3em] font-semibold">{today}</p>
            </div>

            <div className="flex items-center gap-0 border border-white/10">
              {[
                { label: 'Completion Rate', value: `${completionRate}%`,          color: 'text-emerald-300' },
                { label: 'Pending Now',     value: statusCounts.pending || 0,     color: 'text-orange-300' },
                { label: 'Cancelled',       value: statusCounts.cancelled || 0,   color: 'text-rose-300'   },
              ].map((kpi, i) => (
                <div key={i} className={`px-6 py-4 ${i < 2 ? 'border-r border-white/10' : ''}`}>
                  <p className="font-sans text-[9px] uppercase tracking-[0.25em] text-violet-300 font-bold mb-1">{kpi.label}</p>
                  <p className={`font-sans font-black text-xl ${kpi.color}`} style={{ letterSpacing: '-0.03em' }}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Thin violet accent bar ── */}
      <div className="h-[3px] w-full"
        style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 50%, transparent 100%)' }} />

      <div className="px-6 md:px-10 py-10 max-w-7xl mx-auto space-y-14">

        {/* ── STAT CARDS ── */}
        <div>
          <SectionLabel>Overview</SectionLabel>
          <Divider />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total Earnings"     value={`₱${totalEarnings.toLocaleString()}`} sub="All-time revenue" />
            <StatCard label="Total Appointments" value={totalAppointments}                     sub="All bookings" />
            <StatCard label="Completed Jobs"     value={statusCounts.completed || 0}           sub="Delivered services" />
          </div>
        </div>

        {/* ── CHARTS ── */}
        <div>
          <SectionLabel>Analytics</SectionLabel>
          <Divider />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Area chart */}
            <div className="lg:col-span-2 bg-white border border-violet-100 px-7 py-8"
              style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
              <div className="flex items-center justify-between mb-6">
                <p className="font-sans text-xs uppercase tracking-[0.25em] text-neutral-700 font-bold">Earnings — Last 6 Months</p>
                <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-violet-400 font-bold border border-violet-100 px-2 py-1">Monthly</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={earningsByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bEarningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month"
                    tick={{ fontSize: 10, fill: '#7c3aed', fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: 2 }}
                    axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#a78bfa', fontFamily: 'sans-serif', fontWeight: 600 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip content={<EarningsTooltip />} />
                  <Area type="monotone" dataKey="earnings" stroke={PRIMARY} strokeWidth={2.5}
                    fill="url(#bEarningsGrad)"
                    dot={{ r: 4, fill: '#fff', stroke: PRIMARY, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: PRIMARY, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut */}
            <div className="bg-white border border-violet-100 px-7 py-8"
              style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
              <div className="flex items-center justify-between mb-6">
                <p className="font-sans text-xs uppercase tracking-[0.25em] text-neutral-700 font-bold">Status Split</p>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="45%" innerRadius={58} outerRadius={85}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {donutData.map((entry, i) => (
                      <Cell key={i}
                        fill={entry.name === 'Completed' ? COLORS.completed : entry.name === 'Pending' ? COLORS.pending : COLORS.cancelled} />
                    ))}
                  </Pie>
                  <Legend iconType="square" iconSize={8}
                    formatter={v => (
                      <span style={{ fontFamily: 'sans-serif', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6b7280' }}>
                        {v}
                      </span>
                    )} />
                  <Tooltip
                    contentStyle={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 700, border: '1px solid #ede9fe', borderRadius: 0 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── BOOKINGS BREAKDOWN ── */}
        <div>
          <SectionLabel>Bookings Breakdown</SectionLabel>
          <Divider />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Bar chart */}
            <div className="bg-white border border-violet-100 px-7 py-8"
              style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
              <p className="font-sans text-xs uppercase tracking-[0.25em] text-neutral-700 font-bold mb-6">By Service</p>
              {appointmentsByService.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3">
                  <div className="w-8 h-8 border border-dashed border-violet-200 flex items-center justify-center">
                    <span className="text-violet-300 text-xs">—</span>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-neutral-300 font-semibold">No data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={appointmentsByService} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number"
                      tick={{ fontSize: 10, fill: '#a78bfa', fontFamily: 'sans-serif', fontWeight: 600 }}
                      axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90}
                      tick={{ fontSize: 10, fill: '#374151', fontFamily: 'sans-serif', fontWeight: 700 }}
                      axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f5f3ff' }} formatter={v => [v, 'Bookings']}
                      contentStyle={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 700, border: '1px solid #ede9fe', borderRadius: 0 }} />
                    <Bar dataKey="count" radius={0}>
                      {appointmentsByService.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Latest appointments table */}
            <div className="lg:col-span-2 bg-white border border-violet-100 px-7 py-8"
              style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
              <div className="flex items-center justify-between mb-6">
                <p className="font-sans text-xs uppercase tracking-[0.25em] text-neutral-700 font-bold">Latest Appointments</p>
                {latestAppointments.length > 0 && (
                  <span className="font-sans text-[9px] uppercase tracking-[0.2em] text-violet-400 font-bold border border-violet-100 px-2 py-1">
                    {latestAppointments.length} records
                  </span>
                )}
              </div>

              {latestAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] gap-3">
                  <div className="w-8 h-8 border border-dashed border-violet-200 flex items-center justify-center">
                    <span className="text-violet-300 text-xs">—</span>
                  </div>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-neutral-300 font-semibold">No appointments yet</p>
                </div>
              ) : (
                <div className="divide-y divide-violet-50">
                  <div className="grid grid-cols-4 pb-3 border-b border-violet-100">
                    {['Customer', 'Date & Time', 'Amount', 'Status'].map(h => (
                      <p key={h} className="font-sans text-[9px] uppercase tracking-[0.3em] text-violet-300 font-bold">{h}</p>
                    ))}
                  </div>

                  {latestAppointments.map((appt, idx) => (
                    <div
                      key={appt._id}
                      className="grid grid-cols-4 items-center py-3.5 hover:bg-violet-50/60 -mx-7 px-7 transition-colors cursor-default group"
                    >
                      <div className="flex items-center gap-2.5">
                        {appt.userData?.image ? (
                          <img src={appt.userData.image}
                            className="w-7 h-7 object-cover flex-shrink-0 ring-1 ring-violet-100"
                            alt="" />
                        ) : (
                          <div className="w-7 h-7 bg-violet-600 flex items-center justify-center text-white font-black font-sans text-xs flex-shrink-0"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)' }}>
                            {appt.userData?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="font-sans text-xs text-neutral-800 font-semibold truncate max-w-[90px] group-hover:text-violet-700 transition-colors">
                          {appt.userData?.name || '—'}
                        </span>
                      </div>

                      <div>
                        <p className="font-sans text-xs text-neutral-700 font-semibold">{appt.slotDate}</p>
                        <p className="font-sans text-[10px] text-neutral-400 font-medium">{appt.slotTime}</p>
                      </div>

                      <p className="font-sans text-sm font-black text-violet-800" style={{ letterSpacing: '-0.02em' }}>
                        ₱{(appt.finalAmount ?? appt.totalAmount ?? 0).toLocaleString()}
                      </p>

                      <StatusChip appt={appt} />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  )
}

export default BranchDashboard