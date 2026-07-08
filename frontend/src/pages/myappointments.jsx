import React, { useContext, useEffect, useState, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'

const DELIVERY_STATUS_MAP = {
  pending_approval: { label: 'Waiting for Approval', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  approved:         { label: 'Approved',              color: 'text-blue-600 bg-blue-50 border-blue-200' },
  picked_up:        { label: 'Picked Up',             color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  in_progress:      { label: 'On Process',            color: 'text-violet-600 bg-violet-50 border-violet-200' },
  out_for_delivery: { label: 'Out for Delivery',      color: 'text-purple-600 bg-purple-50 border-purple-200' },
  delivered:        { label: 'Delivered',             color: 'text-green-600 bg-green-50 border-green-200' },
}

const PAYMENT_STATUS_MAP = {
  unpaid:          { label: 'Unpaid',        color: 'text-neutral-400 bg-neutral-50 border-neutral-200' },
  pending_payment: { label: 'Payment Due',   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  paid_cash:       { label: 'Paid — Cash',   color: 'text-green-600 bg-green-50 border-green-200' },
  paid_online:     { label: 'Paid — Online', color: 'text-blue-600 bg-blue-50 border-blue-200' },
}

const AUTO_REFRESH_INTERVAL = 30

const fmt = (n, symbol = '₱') =>
  `${symbol}${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

// Consistent with branch/admin resolvePaymentStatus
const resolvePaymentStatus = (item) => {
  if (item.paymentStatus) return item.paymentStatus
  if (item.payment) return item.paymentMethod === 'online' ? 'paid_online' : 'paid_cash'
  return 'unpaid'
}

const Chip = ({ label, color }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-sans uppercase tracking-[0.2em] border ${color}`}>
    {label}
  </span>
)

const ArchiveModal = ({ onConfirm, onClose }) => (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm'>
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white w-full max-w-sm overflow-hidden'>
      <div className='bg-violet-600 px-8 py-6 relative overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans block mb-1 relative z-10'>Archive</span>
        <h2 className='text-white font-bold leading-none relative z-10' style={{ fontSize: '22px', letterSpacing: '-0.02em' }}>
          Archive this?
        </h2>
      </div>
      <div className='px-8 py-7 flex flex-col gap-6'>
        <p className='font-sans text-sm text-neutral-500 leading-relaxed'>
          This appointment will be moved to your Archive tab and hidden from other views.
        </p>
        <div className='flex gap-3'>
          <button onClick={onClose}
            className='flex-1 py-3 font-sans text-xs tracking-widest uppercase font-bold border border-violet-200 text-violet-400 hover:border-violet-400 hover:text-violet-600 transition-colors'
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className='group relative overflow-hidden flex-1 py-3 font-sans text-xs tracking-widest uppercase font-bold bg-violet-600 text-white inline-flex items-center justify-center'
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
            <span className='relative z-10'>Archive</span>
            <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
          </button>
        </div>
      </div>
    </div>
  </div>
)

const WeightBreakdown = ({ services }) => {
  if (!Array.isArray(services) || services.length === 0) return null
  return (
    <div className='mt-1 space-y-2'>
      {services.map((svc, idx) => {
        const extras = Array.isArray(svc.extraServices) ? svc.extraServices : []
        return (
          <div key={idx} className='font-sans text-xs'>
            <div className='flex items-center gap-2'>
              <span className='text-neutral-400'>Basket {idx + 1} — {svc.name}:</span>
              {svc.actualKg != null ? (
                <span className='flex items-center gap-1'>
                  <span className='line-through text-neutral-300'>{svc.kg}kg</span>
                  <span className='text-violet-700 font-semibold'>{svc.actualKg}kg</span>
                  {svc.overweightCharge > 0 && <span className='text-amber-600 text-[10px]'>(+overweight)</span>}
                </span>
              ) : (
                <span className='text-neutral-600'>{svc.kg}kg <span className='text-neutral-400'>(estimated)</span></span>
              )}
            </div>
            {extras.length > 0 && (
              <div className='mt-0.5 pl-3 flex flex-wrap gap-x-3 gap-y-0.5'>
                {extras.map((ex, ei) => (
                  <span key={ei} className='text-violet-500 font-semibold'>
                    + {ex.name}{ex.fee != null ? ` (₱${Number(ex.fee).toFixed(2)})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
 

const AmountDisplay = ({ item, currencySymbol }) => {
  const sym         = currencySymbol || '₱'
  const hasActual   = item.actualFinalAmount != null
  const estimated   = item.finalAmount ?? item.totalAmount ?? 0
  const actual      = item.actualFinalAmount ?? estimated
  const hasDiscount = item.discountAmount > 0 && item.promoCode
  const vatPercent  = Math.round((item.vatRate ?? 0) * 100)

  if (hasActual) {
    return (
      <div className='text-right shrink-0'>
        <p className='font-sans text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5'>Estimated</p>
        <p className='font-sans text-xs text-neutral-400 line-through'>{fmt(estimated, sym)}</p>
        <p className='font-sans text-[10px] text-violet-500 uppercase tracking-wider mt-1 mb-0.5'>Final Amount</p>
        <p className='font-bold text-violet-900' style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>{fmt(actual, sym)}</p>
        {item.overweightChargeTotal > 0 && (
          <p className='font-sans text-[10px] text-amber-600 mt-0.5'>incl. overweight +{fmt(item.overweightChargeTotal, sym)}</p>
        )}
      </div>
    )
  }

  return (
    <div className='text-right shrink-0'>
      {hasDiscount && <p className='font-sans text-xs line-through text-neutral-300'>{fmt(item.totalAmount, sym)}</p>}
      {vatPercent > 0 && <p className='font-sans text-[10px] text-neutral-400'>VAT {vatPercent}% incl.</p>}
      <p className='font-bold text-violet-900' style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>{fmt(estimated, sym)}</p>
      <p className='font-sans text-[10px] text-neutral-400 mt-0.5'>estimated</p>
    </div>
  )
}

const AppointmentCard = ({ item, currencySymbol, onCancel, onArchive, onPayOnline, payingId }) => {
  const payStatus  = resolvePaymentStatus(item)
  const isPaid     = payStatus === 'paid_cash' || payStatus === 'paid_online'
  const canArchive = item.cancelled || item.isCompleted

  // FIX 1: canCancel — only at pending_approval. Removed !isPaid (irrelevant at this stage
  // and confusing). Business rule: once approved, cancellation is no longer allowed.
  const canCancel = !item.cancelled && !item.isCompleted
    && item.deliveryStatus === 'pending_approval'

  // FIX 2: canPayOnline — guard with actualFinalAmount != null so button only appears
  // after branch has confirmed actual weight and final amount is set.
  const paymentDue     = payStatus === 'pending_payment'
  const isOnlineMethod = item.preferredPaymentMethod === 'online'
  const isWeighed      = item.actualFinalAmount != null
  const canPayOnline   = !item.cancelled && !isPaid && paymentDue && isOnlineMethod && isWeighed

  // FIX 3: cashPaymentDue — same guard: only show after weight confirmed (actualFinalAmount set)
  const isCashMethod   = item.preferredPaymentMethod === 'cash' || !item.preferredPaymentMethod
  const cashPaymentDue = paymentDue && isCashMethod && isWeighed

  const serviceLabel = Array.isArray(item.services) && item.services.length > 0
    ? item.services.map(s => s?.name ?? s).filter(Boolean).join(', ')
    : item.service ?? '—'

  const statusInfo    = DELIVERY_STATUS_MAP[item.deliveryStatus]
  const payStatusInfo = PAYMENT_STATUS_MAP[payStatus] || PAYMENT_STATUS_MAP.unpaid
  const isPayingThis  = payingId === item._id

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}
      className={`bg-white border overflow-hidden transition-all duration-200 hover:border-violet-200 hover:shadow-sm
        ${item.cancelled ? 'border-violet-50 opacity-70' : 'border-violet-100'}`}>

      <div className='flex gap-0'>
        <div className='relative w-24 shrink-0 overflow-hidden'>
          <img src={item.branchData?.image} alt={item.branchData?.name}
            className='w-full h-full object-cover' style={{ minHeight: '140px' }} />
          {item.cancelled && (
            <div className='absolute inset-0 bg-violet-900/40 flex items-end justify-start p-2'>
              <span className='font-sans text-[8px] font-bold tracking-[0.2em] text-white uppercase'>Cancelled</span>
            </div>
          )}
        </div>

        <div className='flex-1 min-w-0 px-5 py-5 flex flex-col gap-3'>
          <div className='flex items-start justify-between gap-2'>
            <div>
              <p className='font-bold text-violet-900 leading-none mb-1' style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>
                {item.branchData?.name}
              </p>
              <p className='font-sans text-xs text-neutral-400'>{item.slotDate} · {item.slotTime}</p>
            </div>
            {canArchive && (
              <button onClick={onArchive} title='Archive'
                className='text-violet-200 hover:text-violet-500 transition-colors shrink-0 p-1'>
                <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' />
                </svg>
              </button>
            )}
          </div>

          <div className='font-sans text-xs text-neutral-500 space-y-0.5'>
            <p><span className='text-neutral-700 font-semibold'>Service:</span> {serviceLabel}</p>
            <WeightBreakdown services={item.services} />
            {item.pickupAddress?.line1 && (
              <p><span className='text-neutral-700 font-semibold'>Pickup:</span>{' '}
                {[item.pickupAddress.line1, item.pickupAddress.line2].filter(Boolean).join(', ')}
              </p>
            )}
            {item.preferredPickupWindow && (
              <p><span className='text-neutral-700 font-semibold'>Pickup window:</span> {item.preferredPickupWindow}</p>
            )}
            {item.specialInstructions && (
              <p><span className='text-neutral-700 font-semibold'>Notes:</span> {item.specialInstructions}</p>
            )}
            {item.addOns?.length > 0 && (
              <p><span className='text-neutral-700 font-semibold'>Add-ons:</span>{' '}
                {item.addOns.map(a => `${a.name} ×${a.quantity}`).join(', ')}
              </p>
            )}
            {item.promoCode && (
              <p className='text-green-600'><span className='font-semibold'>Promo:</span> {item.promoCode}</p>
            )}
            {item.preferredPaymentMethod && (
              <p><span className='text-neutral-700 font-semibold'>Payment:</span>{' '}
                <span className='text-violet-600'>
                  {item.preferredPaymentMethod === 'cash' ? ' Cash on Delivery' : ' Online Payment'}
                </span>
              </p>
            )}
          </div>

          <div className='flex items-end justify-between gap-2 mt-auto'>
            <div className='flex flex-wrap gap-1.5'>
              <Chip label={payStatusInfo.label} color={payStatusInfo.color} />
              {item.cancelled
                ? <Chip label='Cancelled' color='text-red-500 bg-red-50 border-red-200' />
                : statusInfo && <Chip label={statusInfo.label} color={statusInfo.color} />
              }
            </div>
            <AmountDisplay item={item} currencySymbol={currencySymbol} />
          </div>
        </div>
      </div>

      {/* Cash payment due banner — only after weight confirmed (actualFinalAmount set) */}
      {cashPaymentDue && !item.cancelled && (
        <div className='border-t border-amber-100 bg-amber-50 px-5 py-3'>
          <p className='font-sans text-xs text-amber-700'>
            <span className='font-bold'>Your laundry has been weighed.</span>{' '}
            Final amount is <span className='font-bold'>{fmt(item.actualFinalAmount, currencySymbol)}</span>.
            Please prepare cash — payment will be collected upon delivery.
          </p>
        </div>
      )}

      {/* Online payment due banner + Pay Now — only after weight confirmed */}
      {canPayOnline && !item.cancelled && (
        <div className='border-t border-violet-100 bg-violet-50 px-5 py-3 flex items-center justify-between gap-4'>
          <p className='font-sans text-xs text-violet-700'>
            <span className='font-bold'>Final amount: {fmt(item.actualFinalAmount, currencySymbol)}</span>
            {' '}— Pay online now to complete your booking.
          </p>
          {/* FIX 4: loading state on Pay Online — prevents double-click */}
          <button
            onClick={onPayOnline}
            disabled={isPayingThis}
            className='group relative overflow-hidden font-sans text-xs px-5 py-2 bg-violet-600 text-white uppercase tracking-widest font-bold inline-flex items-center gap-2 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed'
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
            <span className='relative z-10'>{isPayingThis ? 'Redirecting...' : 'Pay Online →'}</span>
            {!isPayingThis && <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />}
          </button>
        </div>
      )}

      {/* Cancel button — pending_approval only */}
      {canCancel && (
        <div className='border-t border-violet-50 px-5 py-3 flex gap-2 justify-end bg-violet-50/30'>
          <button onClick={onCancel}
            className='font-sans text-xs px-5 py-2 border border-red-200 text-red-400 hover:bg-red-50 transition-colors uppercase tracking-widest font-bold'
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
            Cancel Appointment
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
const MyAppointments = () => {
  const {
    appointments, getUserAppointments,
    cancelAppointment, createPayment,
    currencySymbol, token,
  } = useContext(AppContext)

  const [activeTab,    setActiveTab]    = useState('active')
  const [archiveModal, setArchiveModal] = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [secondsAgo,   setSecondsAgo]   = useState(0)
  // FIX 4: track which appointment is being paid to prevent double-click
  const [payingId,     setPayingId]     = useState(null)
  const [archived,     setArchived]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('archivedAppointments') || '[]') } catch { return [] }
  })

  const refresh = useCallback(async () => {
    if (!token) return
    await getUserAppointments()
    setLastUpdated(new Date())
    setSecondsAgo(0)
  }, [token, getUserAppointments])

  useEffect(() => { refresh() }, [token])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(refresh, AUTO_REFRESH_INTERVAL * 1000)
    return () => clearInterval(interval)
  }, [token, refresh])

  useEffect(() => {
    if (!lastUpdated) return
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  const handleArchive = (id) => {
    const next = [...new Set([...archived, id])]
    setArchived(next)
    localStorage.setItem('archivedAppointments', JSON.stringify(next))
    setArchiveModal(null)
    toast.success('Appointment archived')
  }

  // FIX 4: wrap createPayment with loading guard
  const handlePayOnline = async (id) => {
    if (payingId) return
    setPayingId(id)
    try {
      await createPayment(id)
    } finally {
      setPayingId(null)
    }
  }

  const lastUpdatedLabel = lastUpdated
    ? secondsAgo < 5  ? 'Just now'
    : secondsAgo < 60 ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`
    : '—'

  const visible  = appointments.filter(i => !archived.includes(i._id))
  const archList = appointments.filter(i =>  archived.includes(i._id))

  const filtered = {
    // Active: not cancelled, not delivered, not completed
    active:    visible.filter(i => !i.cancelled && !i.isCompleted && i.deliveryStatus !== 'delivered'),
    // Done: delivered OR isCompleted (whichever backend sets), not cancelled
    done:      visible.filter(i => !i.cancelled && (i.isCompleted || i.deliveryStatus === 'delivered')),
    cancelled: visible.filter(i =>  i.cancelled),
    all:       visible,
    archived:  archList,
  }

  const TABS = [
    { key: 'active',    label: 'Active' },
    { key: 'done',      label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'archived',  label: 'Archived' },
    { key: 'all',       label: 'All' },
  ]

  const EMPTY_MSG = {
    active:    'No active appointments right now.',
    done:      'No completed appointments yet.',
    cancelled: 'No cancelled appointments.',
    archived:  'Archived appointments will appear here.',
    all:       'Book your first appointment to get started.',
  }

  const displayList = filtered[activeTab] ?? []

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}
      className='flex flex-col h-[calc(100vh-70px)] w-full px-6 md:px-16 py-10 bg-white'>

      {archiveModal && (
        <ArchiveModal
          onConfirm={() => handleArchive(archiveModal)}
          onClose={() => setArchiveModal(null)}
        />
      )}

      <div className='shrink-0 mb-8'>
        <span className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans block mb-3'>Your History</span>
        <div className='h-px bg-violet-100 mb-6' />
        <div className='flex items-end justify-between gap-4 flex-wrap'>
          <h1 className='leading-none text-violet-900'
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            My Appointments.
          </h1>
          <div className='flex items-center gap-4 mb-1'>
            <span className='font-sans text-xs text-neutral-400'>
              <span className='text-violet-600 font-bold'>{appointments.length}</span> total
            </span>
            <span className='font-sans text-[10px] text-neutral-300 uppercase tracking-widest'>
              Updated {lastUpdatedLabel}
            </span>
          </div>
        </div>
      </div>

      <div className='shrink-0 flex gap-0 mb-6 border-b border-violet-100 overflow-x-auto'>
        {TABS.map(tab => {
          const count    = filtered[tab.key]?.length ?? 0
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 font-sans text-xs uppercase tracking-[0.25em] font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive ? 'border-violet-600 text-violet-600' : 'border-transparent text-neutral-400 hover:text-violet-400'
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 font-sans font-bold ${
                  isActive ? 'bg-violet-100 text-violet-600' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className='flex-1 overflow-y-auto space-y-4 pb-6 pr-1
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-violet-200
        [&::-webkit-scrollbar-thumb]:rounded-full'>

        {displayList.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full py-20 text-center'>
            <div className='border border-violet-100 w-16 h-16 flex items-center justify-center mb-5'>
              <span className='text-2xl'>{activeTab === 'archived' ? '🗂' : '🧺'}</span>
            </div>
            <span className='uppercase tracking-[0.35em] text-[10px] text-violet-300 font-sans block mb-2'>Empty</span>
            <p className='font-sans text-sm text-neutral-400'>{EMPTY_MSG[activeTab]}</p>
          </div>
        ) : (
          displayList.map(item => (
            <AppointmentCard
              key={item._id}
              item={item}
              currencySymbol={currencySymbol}
              onCancel={() => cancelAppointment(item._id)}
              onArchive={() => setArchiveModal(item._id)}
              onPayOnline={() => handlePayOnline(item._id)}
              payingId={payingId}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default MyAppointments