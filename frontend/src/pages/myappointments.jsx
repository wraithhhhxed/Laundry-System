import React, { useContext, useEffect, useState, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'

const DELIVERY_STATUS_MAP = {
  pending_approval: { label: 'Waiting for Approval', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  approved:         { label: 'Approved',              color: 'text-blue-600 bg-blue-50 border-blue-200' },
  picked_up:        { label: 'Picked Up',             color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  in_progress:      { label: 'On Process',            color: 'text-blue-600 bg-blue-50 border-blue-200' },
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
  <span className={`inline-flex items-center px-3 py-1 text-[11px] font-sans uppercase tracking-[0.2em] border ${color}`}>
    {label}
  </span>
)

const ArchiveModal = ({ onConfirm, onClose }) => (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm'>
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white w-full max-w-md overflow-hidden'>
      <div className='bg-blue-600 px-8 py-7 relative overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans block mb-2 relative z-10'>Archive</span>
        <h2 className='text-white font-bold leading-none relative z-10' style={{ fontSize: '24px', letterSpacing: '-0.02em' }}>
          Archive this?
        </h2>
      </div>
      <div className='px-8 py-8 flex flex-col gap-6'>
        <p className='font-sans text-base text-neutral-500 leading-relaxed'>
          This appointment will be moved to your Archive tab and hidden from other views.
        </p>
        <div className='flex gap-4'>
          <button onClick={onClose}
            className='flex-1 py-3.5 font-sans text-xs tracking-widest uppercase font-bold border border-blue-200 text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors'
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className='group relative overflow-hidden flex-1 py-3.5 font-sans text-xs tracking-widest uppercase font-bold bg-blue-600 text-white inline-flex items-center justify-center'
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
            <span className='relative z-10'>Archive</span>
            <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
          </button>
        </div>
      </div>
    </div>
  </div>
)

// Delete confirmation modal
const DeleteModal = ({ onConfirm, onClose }) => (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm'>
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white w-full max-w-md overflow-hidden'>
      <div className='bg-red-600 px-8 py-7 relative overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans block mb-2 relative z-10'>Delete</span>
        <h2 className='text-white font-bold leading-none relative z-10' style={{ fontSize: '24px', letterSpacing: '-0.02em' }}>
          Delete permanently?
        </h2>
      </div>
      <div className='px-8 py-8 flex flex-col gap-6'>
        <p className='font-sans text-base text-neutral-500 leading-relaxed'>
          This appointment will be permanently deleted and cannot be recovered.
        </p>
        <div className='flex gap-4'>
          <button onClick={onClose}
            className='flex-1 py-3.5 font-sans text-xs tracking-widest uppercase font-bold border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 transition-colors'
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className='group relative overflow-hidden flex-1 py-3.5 font-sans text-xs tracking-widest uppercase font-bold bg-red-600 text-white inline-flex items-center justify-center'
            style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
            <span className='relative z-10'>Delete</span>
            <div className='absolute inset-0 bg-red-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
          </button>
        </div>
      </div>
    </div>
  </div>
)

// Weight breakdown with better spacing
const WeightBreakdown = ({ services }) => {
  if (!Array.isArray(services) || services.length === 0) return null
  return (
    <div className='mt-2 space-y-2'>
      {services.map((svc, idx) => (
        <div key={idx} className='font-sans text-sm'>
          <div className='flex items-center gap-3'>
            <span className='text-neutral-400'>Basket {idx + 1} — {svc.name}:</span>
            {svc.actualKg != null ? (
              <span className='flex items-center gap-2'>
                <span className='line-through text-neutral-300'>{svc.kg}kg</span>
                <span className='text-blue-700 font-semibold'>{svc.actualKg}kg confirmed</span>
              </span>
            ) : (
              <span className='text-neutral-600'>{svc.kg}kg <span className='text-neutral-400'>(estimated)</span></span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const AmountDisplay = ({ item, currencySymbol }) => {
  const sym         = currencySymbol || '₱'
  const amount      = item.finalAmount ?? item.totalAmount ?? 0
  const hasDiscount = item.discountAmount > 0 && item.promoCode
  const vatPercent  = Math.round((item.vatRate ?? 0) * 100)

  return (
    <div className='text-right shrink-0'>
      {hasDiscount && <p className='font-sans text-sm line-through text-neutral-300'>{fmt(item.totalAmount, sym)}</p>}
      {vatPercent > 0 && <p className='font-sans text-xs text-neutral-400'>VAT {vatPercent}% incl.</p>}
      <p className='font-bold text-blue-900' style={{ fontSize: '18px', letterSpacing: '-0.02em' }}>{fmt(amount, sym)}</p>
    </div>
  )
}

const AppointmentCard = ({ 
  item, 
  currencySymbol, 
  onCancel, 
  onArchive, 
  onDelete,
  onPayOnline, 
  payingId,
  isArchivedView = false
}) => {
  const payStatus  = resolvePaymentStatus(item)
  const isPaid     = payStatus === 'paid_cash' || payStatus === 'paid_online'
  const canArchive = (item.cancelled || item.isCompleted) && !isArchivedView

  const canCancel = !item.cancelled && !item.isCompleted
    && item.deliveryStatus === 'pending_approval'

  const paymentDue     = payStatus === 'pending_payment'
  const isOnlineMethod = item.preferredPaymentMethod === 'online'
  const isWeighed       = item.weightConfirmedAt != null
  const canPayOnline    = !item.cancelled && !isPaid && paymentDue && isOnlineMethod && isWeighed

  const isCashMethod   = item.preferredPaymentMethod === 'cash' || !item.preferredPaymentMethod
  const cashPaymentDue = paymentDue && isCashMethod && isWeighed

  const serviceLabel = Array.isArray(item.services) && item.services.length > 0
    ? item.services.map(s => s?.name ?? s).filter(Boolean).join(', ')
    : item.service ?? '—'

  const statusInfo    = DELIVERY_STATUS_MAP[item.deliveryStatus]
  const payStatusInfo = PAYMENT_STATUS_MAP[payStatus] || PAYMENT_STATUS_MAP.unpaid
  const isPayingThis  = payingId === item.id

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}
      className={`bg-white border overflow-hidden transition-all duration-200 hover:border-blue-200 hover:shadow-md
        ${item.cancelled ? 'border-blue-50 opacity-70' : 'border-blue-100'}`}>

      <div className='flex gap-0'>
        {/* Image section - slightly larger */}
        <div className='relative w-32 shrink-0 overflow-hidden'>
          <img src={item.branchData?.image} alt={item.branchData?.name}
            className='w-full h-full object-cover' style={{ minHeight: '180px' }} />
          {item.cancelled && (
            <div className='absolute inset-0 bg-blue-900/40 flex items-end justify-start p-3'>
              <span className='font-sans text-[9px] font-bold tracking-[0.2em] text-white uppercase'>Cancelled</span>
            </div>
          )}
        </div>

        {/* Content section - more padding and spacing */}
        <div className='flex-1 min-w-0 px-6 py-6 flex flex-col gap-4'>
          {/* Header with title and action buttons */}
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='font-bold text-blue-900 leading-none mb-1.5' style={{ fontSize: '17px', letterSpacing: '-0.02em' }}>
                {item.branchData?.name}
              </p>
              <p className='font-sans text-sm text-neutral-400'>{item.slotDate} · {item.slotTime}</p>
            </div>
            {/* Action buttons - bigger and more visible */}
            {canArchive && (
              <button onClick={onArchive} title='Archive'
                className='text-blue-300 hover:text-blue-600 transition-colors shrink-0 p-2 hover:bg-blue-50 rounded'>
                <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' />
                </svg>
              </button>
            )}
            {isArchivedView && (
              <button onClick={onDelete} title='Delete permanently'
                className='text-red-300 hover:text-red-600 transition-colors shrink-0 p-2 hover:bg-red-50 rounded'>
                <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                </svg>
              </button>
            )}
          </div>

          {/* Details section - better spacing and larger text */}
          <div className='font-sans text-sm text-neutral-500 space-y-1.5'>
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
                <span className='text-blue-600'>
                  {item.preferredPaymentMethod === 'cash' ? ' Cash on Delivery' : ' Online Payment'}
                </span>
              </p>
            )}
          </div>

          {/* Status chips and amount - more spacing */}
          <div className='flex items-end justify-between gap-4 mt-2'>
            <div className='flex flex-wrap gap-2'>
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

      {/* Action footers - more padding */}
      {cashPaymentDue && !item.cancelled && (
        <div className='border-t border-amber-100 bg-amber-50 px-6 py-4'>
          <p className='font-sans text-sm text-amber-700'>
            <span className='font-bold'>Your laundry weight has been confirmed.</span>{' '}
            Amount due is <span className='font-bold'>{fmt(item.finalAmount, currencySymbol)}</span>.
            Please prepare cash — payment will be collected upon delivery.
          </p>
        </div>
      )}

      {canPayOnline && !item.cancelled && (
        <div className='border-t border-blue-100 bg-blue-50 px-6 py-4 flex items-center justify-between gap-4'>
          <p className='font-sans text-sm text-blue-700'>
            <span className='font-bold'>Amount due: {fmt(item.finalAmount, currencySymbol)}</span>
            {' '}— Pay online now to complete your booking.
          </p>
          <button
            onClick={onPayOnline}
            disabled={isPayingThis}
            className='group relative overflow-hidden font-sans text-sm px-6 py-2.5 bg-blue-600 text-white uppercase tracking-widest font-bold inline-flex items-center gap-2 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed'
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
            <span className='relative z-10'>{isPayingThis ? 'Redirecting...' : 'Pay Online →'}</span>
            {!isPayingThis && <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />}
          </button>
        </div>
      )}

      {canCancel && (
        <div className='border-t border-blue-50 px-6 py-4 flex gap-3 justify-end bg-blue-50/30'>
          <button onClick={onCancel}
            className='font-sans text-sm px-6 py-2.5 border border-red-200 text-red-400 hover:bg-red-50 transition-colors uppercase tracking-widest font-bold'
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
  const [deleteModal, setDeleteModal]   = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [secondsAgo,   setSecondsAgo]   = useState(0)
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

  const handleDelete = (id) => {
    const next = archived.filter(itemId => itemId !== id)
    setArchived(next)
    localStorage.setItem('archivedAppointments', JSON.stringify(next))
    setDeleteModal(null)
    toast.success('Appointment permanently deleted')
  }

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

 const visible  = appointments.filter(i => !archived.includes(i.id)).sort((a, b) => Number(b.date) - Number(a.date))
  const archList = appointments.filter(i =>  archived.includes(i.id)).sort((a, b) => Number(b.date) - Number(a.date))

  const filtered = {
    active:    visible.filter(i => !i.cancelled && !i.isCompleted && i.deliveryStatus !== 'delivered'),
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
  const isArchivedTab = activeTab === 'archived'

  return (
    <div style={{ fontFamily: "'Georgia', serif" }}
      className='flex flex-col h-[calc(100vh-70px)] w-full px-8 md:px-20 py-12 bg-white'>

      {archiveModal && (
        <ArchiveModal
          onConfirm={() => handleArchive(archiveModal)}
          onClose={() => setArchiveModal(null)}
        />
      )}

      {deleteModal && (
        <DeleteModal
          onConfirm={() => handleDelete(deleteModal)}
          onClose={() => setDeleteModal(null)}
        />
      )}

      <div className='shrink-0 mb-10'>
        <span className='uppercase tracking-[0.35em] text-[11px] text-blue-400 font-sans block mb-4'>Your History</span>
        <div className='h-px bg-blue-100 mb-8' />
        <div className='flex items-end justify-between gap-6 flex-wrap'>
          <h1 className='leading-none text-blue-900'
            style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            My Appointments.
          </h1>
          <div className='flex items-center gap-6 mb-1'>
            <span className='font-sans text-sm text-neutral-400'>
              <span className='text-blue-600 font-bold'>{appointments.length}</span> total
            </span>
            <span className='font-sans text-xs text-neutral-300 uppercase tracking-widest'>
              Updated {lastUpdatedLabel}
            </span>
          </div>
        </div>
      </div>

      <div className='shrink-0 flex gap-0 mb-8 border-b border-blue-100 overflow-x-auto'>
        {TABS.map(tab => {
          const count    = filtered[tab.key]?.length ?? 0
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-3 px-6 py-4 font-sans text-sm uppercase tracking-[0.25em] font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-400 hover:text-blue-400'
              }`}>
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 font-sans font-bold ${
                  isActive ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className='flex-1 overflow-y-auto space-y-6 pb-8 pr-2
        [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-blue-200
        [&::-webkit-scrollbar-thumb]:rounded-full'>

        {displayList.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full py-24 text-center'>
            <div className='border border-blue-100 w-20 h-20 flex items-center justify-center mb-6'>
              <span className='text-3xl'>{activeTab === 'archived' ? '🗂' : '🧺'}</span>
            </div>
            <span className='uppercase tracking-[0.35em] text-xs text-blue-300 font-sans block mb-3'>Empty</span>
            <p className='font-sans text-base text-neutral-400'>{EMPTY_MSG[activeTab]}</p>
          </div>
        ) : (
          displayList.map(item => (
            <AppointmentCard
              key={item.id}
              item={item}
              currencySymbol={currencySymbol}
              onCancel={() => cancelAppointment(item.id)}
              onArchive={() => setArchiveModal(item.id)}
              onDelete={() => setDeleteModal(item.id)}
              onPayOnline={() => handlePayOnline(item.id)}
              payingId={payingId}
              isArchivedView={isArchivedTab}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default MyAppointments