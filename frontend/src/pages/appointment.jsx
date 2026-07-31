import React, { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import RelatedBranches from '../components/RelatedBranches'
import axios from 'axios'
import { toast } from 'react-toastify'

const STEPS = ['Service', 'Weight & Details', 'Add-ons', 'Schedule & Confirm']

const KG_OPTIONS = [1, 2, 3, 4, 5, 6, 7] // hard capacity cap per load — NOT a price driver

const PAYMENT_METHODS = [
  { value: 'cash',   label: 'Cash on Delivery', desc: 'Pay in cash when your laundry is delivered.' },
  { value: 'online', label: 'Online Payment',   desc: 'Pay via GCash, card, or bank transfer through a secure payment link sent once your laundry is weighed.' },
]

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const formatAddress = (address) => {
  if (!address) return null
  if (typeof address === 'string') return address
  return [address.line1, address.line2].filter(Boolean).join(', ')
}

const inputCls =
  'w-full px-4 py-3 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00',
]

const getAvailableTimeSlots = (selectedDate) => {
  const todayStr = new Date().toISOString().split('T')[0]
  if (selectedDate !== todayStr) return TIME_SLOTS
  const now = new Date()
  const cutoff = now.getHours() * 60 + now.getMinutes() + 30
  return TIME_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number)
    return h * 60 + m > cutoff
  })
}

const isPastDate = (dateStr) => {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  return date < today
}

// One basket = one load = one receipt = one machine.
// A basket only carries: which fixed-price service it is, and a declared
// weight (1–7kg) used ONLY as a capacity checkpoint — it never changes price.
let basketSeq = 0
const makeBasket = (service) => ({
  basketKey: `b-${Date.now()}-${basketSeq++}`,
  serviceId: service.id,
  service,
  kg: null,
})

const Appointment = () => {
  const { branchid } = useParams()
  const navigate = useNavigate()
  const { branches, currencySymbol, token, backendUrl, validatePromo } = useContext(AppContext)

  const [branchInfo, setBranchInfo] = useState(null)
  const [step, setStep]             = useState(1)

  const [servicesList, setServicesList] = useState([])
  const [productsList, setProductsList] = useState([])
  const [allProducts,  setAllProducts]  = useState([])

  // ── Baskets (Step 1 & 2) ────────────────────────────────────────────────
  // Each fixed service can have multiple baskets (multiple loads of the
  // same package). Quantity per service drives how many baskets exist.
  const [baskets, setBaskets] = useState([])

  const [sameAddress,         setSameAddress]         = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [pickupAddress,       setPickupAddress]       = useState({ line1: '', line2: '' })
  const [deliveryAddress,     setDeliveryAddress]     = useState({ line1: '', line2: '' })

  const [addOnQty, setAddOnQty] = useState({})

  const [selectedDate,           setSelectedDate]           = useState('')
  const [selectedTime,           setSelectedTime]           = useState('')
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('cash')

  const [vatRate, setVatRate] = useState(0)

  const [promoInput,   setPromoInput]   = useState('')
  const [promoResult,  setPromoResult]  = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState('')

  useEffect(() => {
    const found = branches.find(b => b.id === branchid)
    setBranchInfo(found)
  }, [branchid, branches])

  useEffect(() => { window.scrollTo(0, 0) }, [branchid])

  // ── Initial data fetch ──────────────────────────────────────────────────
  // No more kg-rates, no more extra-services — fixed 5-package pricing only.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, v, p, inv] = await Promise.all([
          axios.get(backendUrl + '/api/user/services'),
          axios.get(backendUrl + '/api/settings/vat'),
          axios.get(backendUrl + '/api/products/active'),
          axios.get(backendUrl + `/api/inventory/public/${branchid}/in-stock`),
        ])
        if (s.data.success) setServicesList((s.data.data.services || []).filter(sv => sv.isActive !== false))
        if (v.data.success) setVatRate(v.data.data.vatRate ?? 0)
        if (p.data.success) {
          setAllProducts(p.data.data)
          if (inv.data?.success) {
            const inStock = new Set(inv.data.data.inStockIds)
            setProductsList(p.data.data.filter(prod => inStock.has(prod.id.toString())))
          } else {
            setProductsList(p.data.data)
          }
        }
      } catch {
        toast.error('Failed to load booking options')
      }
    }
    fetchData()
  }, [backendUrl, branchid])

  useEffect(() => {
    if (step !== 3) return
    Promise.all([
      axios.get(backendUrl + '/api/products/active'),
      axios.get(backendUrl + `/api/inventory/public/${branchid}/in-stock`),
    ]).then(([p, inv]) => {
      if (p.data?.success) {
        setAllProducts(p.data.data)
        if (inv.data?.success) {
          const inStock = new Set(inv.data.data.inStockIds)
          setProductsList(p.data.data.filter(prod => inStock.has(prod.id.toString())))
        } else {
          setProductsList(p.data.data)
        }
      }
    }).catch(() => {})
  }, [step])

  useEffect(() => {
    if (selectedDate) {
      if (isPastDate(selectedDate)) {
        setSelectedDate('')
        setSelectedTime('')
        toast.warning('Your selected date has passed. Please choose a new date.')
        return
      }
      if (selectedTime) {
        const available = getAvailableTimeSlots(selectedDate)
        if (!available.includes(selectedTime)) setSelectedTime('')
      }
    }
  }, [selectedDate])

  useEffect(() => {
    if (step === 4 && selectedDate && isPastDate(selectedDate)) {
      setSelectedDate('')
      setSelectedTime('')
      toast.warning('Your previously selected date has passed. Please pick a new one.')
    }
  }, [step])

  // ── Basket helpers (Step 1) ─────────────────────────────────────────────
  const getQtyForService = (serviceId) => baskets.filter(b => b.serviceId === serviceId).length

  const addBasket = (service) => {
    if (!token) { toast.warning('Please login first'); return navigate('/login') }
    setBaskets(prev => [...prev, makeBasket(service)])
  }

  const removeLastBasketForService = (serviceId) => {
    setBaskets(prev => {
      const idx = [...prev].reverse().findIndex(b => b.serviceId === serviceId)
      if (idx === -1) return prev
      const realIdx = prev.length - 1 - idx
      return prev.filter((_, i) => i !== realIdx)
    })
  }

  const setBasketKg = (basketKey, kg) => {
    setBaskets(prev => prev.map(b => b.basketKey === basketKey ? { ...b, kg } : b))
  }

  // ── Totals ──────────────────────────────────────────────────────────────
  // Fixed per-load pricing: each basket contributes its service's fixed
  // price, full stop. No kg-price, no per-basket extra fees.
  const selectedAddOns = productsList
    .filter(p => addOnQty[p.id] > 0)
    .map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: addOnQty[p.id] }))

  const basketsTotal = baskets.reduce((sum, b) => sum + (b.service?.price || 0), 0)
  const addOnsTotal   = selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0)
  const totalAmount   = basketsTotal + addOnsTotal
  const discountAmount = promoResult?.discountAmount ?? 0
  const discountedBase = totalAmount - discountAmount
  const vatAmount      = parseFloat((discountedBase * vatRate).toFixed(2))
  const vatPercent     = Math.round(vatRate * 100)
  const finalAmount    = parseFloat((discountedBase + vatAmount).toFixed(2))

  useEffect(() => {
    if (promoResult) { setPromoResult(null); setPromoInput(''); setPromoError('') }
  }, [totalAmount])

  const getMinDate = () => new Date().toISOString().split('T')[0]
  const getMaxDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }

  const isSlotFull = (date, time) => {
    if (!branchInfo?.slotsBooked) return false
    const slots = branchInfo.slotsBooked[date]
    if (!Array.isArray(slots)) return false
    return slots.filter(t => t === time).length >= 5
  }

  const availableSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : TIME_SLOTS

  const setQty = (productId, value) => {
    const qty = Math.max(0, Math.min(99, parseInt(value) || 0))
    setAddOnQty(prev => ({ ...prev, [productId]: qty }))
  }
  const incrementQty = (productId) =>
    setAddOnQty(prev => ({ ...prev, [productId]: Math.min(99, (prev[productId] || 0) + 1) }))
  const decrementQty = (productId) =>
    setAddOnQty(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) - 1) }))

  const goNext = () => {
    if (step === 1 && baskets.length === 0)
      return toast.error('Please select at least one service')
    if (step === 2) {
      if (!pickupAddress.line1) return toast.error('Please enter your pickup address')
      for (const b of baskets) {
        if (!b.kg) return toast.error(`Please declare weight for "${b.service.name}" (Basket)`)
      }
    }
    setStep(s => s + 1)
    scrollTop()
  }

  const goBack = (toStep) => { setStep(toStep); scrollTop() }

  const applyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true); setPromoError(''); setPromoResult(null)
    try {
      const result = await validatePromo(promoInput.trim(), totalAmount)
      setPromoResult(result)
      toast.success(`Promo applied! You save ${currencySymbol}${result.discountAmount.toFixed(2)}`)
    } catch (err) {
      setPromoError(err.response?.data?.message || err.message || 'Invalid promo code')
    } finally {
      setPromoLoading(false)
    }
  }

  const removePromo = () => { setPromoResult(null); setPromoInput(''); setPromoError('') }

  const bookAppointment = async () => {
    if (!selectedDate || !selectedTime) return toast.error('Please select date and time')
    if (isPastDate(selectedDate)) return toast.error('Selected date has already passed.')
    const todayStr = new Date().toISOString().split('T')[0]
    if (selectedDate === todayStr) {
      const available = getAvailableTimeSlots(selectedDate)
      if (!available.includes(selectedTime)) return toast.error('That time slot has already passed.')
    }
    if (isSlotFull(selectedDate, selectedTime))
      return toast.warning('This time slot is already full. Please choose another time.')

    try {
      // Matches AppointmentService.bookAppointment contract exactly:
      // servicesInput = [{ serviceId, kg }], kg = capacity check only (1-7).
      const servicesPayload = baskets.map(b => ({
        serviceId: b.serviceId,
        kg: b.kg,
      }))

      const { data } = await axios.post(
        backendUrl + '/api/user/book-appointment',
        {
          branchId: branchid,
          slotDate: selectedDate,
          slotTime: selectedTime,
          services: servicesPayload,
          addOns:   selectedAddOns,
          specialInstructions,
          pickupAddress,
          deliveryAddress: sameAddress ? pickupAddress : deliveryAddress,
          promoCode: promoResult?.code || null,
          preferredPaymentMethod,
        },
        { headers: { token } }
      )
      if (data.success) { toast.success(data.message); navigate('/my-appointments') }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  if (!branchInfo) return null

  const CATEGORY_LABELS = {
    detergent:   'Detergents',
    conditioner: 'Conditioners',
    bleach:      'Bleach',
    other:       'Others',
  }
  const productsByCategory = productsList.reduce((acc, p) => {
    const cat = p.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const branchAddress = formatAddress(branchInfo.address)

  const SectionLabel = ({ children }) => (
    <span className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-3'>
      {children}
    </span>
  )

  const Divider = () => <div className='h-px bg-blue-100 mb-6' />

  const PriceBreakdown = () => (
    <div className='border border-blue-100 bg-blue-50/40 px-6 py-5 mt-2'>
      <SectionLabel>Price Breakdown</SectionLabel>
      <div className='font-sans text-sm space-y-1.5'>
        {baskets.map((b, idx) => (
          <div key={b.basketKey} className='flex justify-between text-neutral-600'>
            <span>Basket {idx + 1} — {b.service.name}{b.kg ? ` (${b.kg}kg declared)` : ''}</span>
            <span>₱{b.service.price.toFixed(2)}</span>
          </div>
        ))}
        {addOnsTotal > 0 && (
          <div className='flex justify-between text-neutral-600'>
            <span>Add-ons</span><span>₱{addOnsTotal.toFixed(2)}</span>
          </div>
        )}
        <div className='flex justify-between text-neutral-600'>
          <span>Subtotal</span><span>₱{totalAmount.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className='flex justify-between text-green-600'>
            <span>Discount</span><span>−₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {vatAmount > 0 && (
          <div className='flex justify-between text-neutral-600'>
            <span>VAT ({vatPercent}%)</span><span>₱{vatAmount.toFixed(2)}</span>
          </div>
        )}
        <div className='h-px bg-blue-200 my-1' />
        <div className='flex justify-between text-blue-700 font-bold text-base'>
          <span>Estimated Total</span><span>₱{finalAmount.toFixed(2)}</span>
        </div>
        <p className='font-sans text-[10px] text-neutral-400 mt-1'>
          Price is fixed per load/package — weight is only checked for the 7kg-per-load capacity limit and does not change your total.
        </p>
      </div>
    </div>
  )

  const NavButtons = ({ backStep, onNext, nextLabel = 'Next →', disabled = false }) => (
    <div className='flex gap-3 pt-4'>
      {backStep && (
        <button
          onClick={() => goBack(backStep)}
          className='px-8 py-3 font-sans text-xs tracking-widest uppercase font-bold border border-blue-200 text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors'
          style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          ← Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className='group relative overflow-hidden bg-blue-600 text-white px-10 py-3 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed'
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
      >
        <span className='relative z-10'>{nextLabel}</span>
        <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
      </button>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white'>

      {/* ── BRANCH HERO ── */}
      <div className='font-bold px-6 md:px-16 pt-14 pb-0'>
        <SectionLabel>Book an Appointment</SectionLabel>
        <Divider />
        <div className='flex flex-col md:flex-row gap-0 items-stretch mb-16'>
          <div className='w-full md:w-2/5 overflow-hidden'>
            <img src={branchInfo.image} alt={branchInfo.name}
              className='w-full h-full object-cover' style={{ maxHeight: '340px' }} />
          </div>
          <div className='flex-1 bg-blue-600 px-8 md:px-12 py-10 flex flex-col justify-center gap-4 relative overflow-hidden'>
            <div className='absolute top-0 left-0 w-full h-full pointer-events-none'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
            <span className='uppercase tracking-[0.35em] text-[10px] text-white/40 font-sans relative z-10'>Branch</span>
            <h1 className='leading-none text-white relative z-10'
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
              {branchInfo.name}
            </h1>
            {branchAddress && (
              <p className='text-white/60 font-sans text-sm flex items-center gap-2 relative z-10'>
                <svg xmlns='http://www.w3.org/2000/svg' className='w-3.5 h-3.5 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                  <path strokeLinecap='round' strokeLinejoin='round' d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                </svg>
                {branchAddress}
              </p>
            )}
            <p className='text-white/60 font-sans text-sm leading-relaxed relative z-10'>{branchInfo.about}</p>
            <div className='h-px bg-white/10 relative z-10' />
            <p className='font-sans text-sm text-white/40 relative z-10'>
              Estimated Total:{' '}
              <span className='text-white font-bold text-lg'>
                {totalAmount > 0 ? `₱${finalAmount.toFixed(2)}` : 'To be computed'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className='px-6 md:px-16 mb-12'>
        <div className='flex items-center gap-0'>
          {STEPS.map((label, i) => {
            const num      = i + 1
            const isActive = step === num
            const isDone   = step > num
            return (
              <React.Fragment key={num}>
                <div className={`flex items-center gap-2 px-4 py-2.5 border transition-colors duration-200 ${
                  isDone   ? 'bg-blue-600 border-blue-600' :
                  isActive ? 'bg-blue-50 border-blue-400' :
                             'bg-white border-blue-100'
                }`}>
                  <span className={`font-sans text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isDone   ? 'bg-white text-blue-600' :
                    isActive ? 'bg-blue-600 text-white' :
                               'bg-blue-100 text-blue-300'
                  }`}>
                    {isDone ? '✓' : num}
                  </span>
                  <span className={`font-sans text-xs uppercase tracking-widest hidden sm:block ${
                    isDone ? 'text-white' : isActive ? 'text-blue-700 font-bold' : 'text-blue-200'
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 max-w-[32px] ${step > num ? 'bg-blue-600' : 'bg-blue-100'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* ── STEP CONTENT ── */}
      <div className='px-6 md:px-16 pb-20'>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <SectionLabel>Step 01 — Choose Your Service</SectionLabel>
            <Divider />
            <h2 className='leading-none text-blue-900 mb-4'
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Select Service.
            </h2>
            <p className='font-sans text-xs text-neutral-400 mb-8'>
              Each service is a fixed-price package (max 7kg per load). Need more than one load?
              Just add another basket of the same or a different service below — one load = one basket.
            </p>

            <div className='flex flex-col gap-3 mb-6'>
              {servicesList.map(service => {
                const qty = getQtyForService(service.id)
                return (
                  <div key={service.id}
                    className={`flex items-center justify-between px-5 py-4 border transition-colors duration-200 ${
                      qty > 0 ? 'bg-blue-50 border-blue-400' : 'bg-white border-blue-100'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                  >
                    <div>
                      <p className='font-sans text-sm font-bold text-neutral-700'>{service.name}</p>
                      <p className='font-sans text-xs text-blue-500 font-semibold mt-0.5'>₱{service.price.toFixed(2)} / load</p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <button onClick={() => removeLastBasketForService(service.id)} disabled={qty === 0}
                        className={`w-8 h-8 font-sans font-bold text-sm flex items-center justify-center border transition-colors ${
                          qty > 0 ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white' : 'border-blue-100 text-blue-200 cursor-not-allowed'
                        }`}>−</button>
                      <span className='font-sans text-sm font-bold text-blue-700 w-6 text-center'>{qty}</span>
                      <button onClick={() => addBasket(service)}
                        className='w-8 h-8 font-sans font-bold text-sm flex items-center justify-center border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors'>+</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {baskets.length > 0 && (
              <div className='border border-blue-100 bg-blue-50/40 px-6 py-4 mb-6 font-sans text-sm'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Selected Baskets</span>
                  <span className='text-blue-400 text-xs'>{baskets.length} basket{baskets.length > 1 ? 's' : ''}</span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {baskets.map((b, idx) => (
                    <span key={b.basketKey} className='inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 font-sans text-xs font-bold'>
                      #{idx + 1} {b.service.name}<span className='text-blue-400'>₱{b.service.price.toFixed(2)}</span>
                    </span>
                  ))}
                </div>
                <div className='h-px bg-blue-100 my-3' />
                <div className='flex justify-between'>
                  <span className='text-neutral-500'>Services Total</span>
                  <span className='text-blue-700 font-bold'>₱{basketsTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <NavButtons onNext={goNext} />
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className='space-y-10'>
            <div>
              <SectionLabel>Step 02 — Weight & Pickup Details</SectionLabel>
              <Divider />
              <h2 className='leading-none text-blue-900 mb-4'
                style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                Your Details.
              </h2>
              <p className='font-sans text-xs text-neutral-400'>
                Declare an estimated weight per basket — this is only checked against the 7kg-per-load limit
                and will be re-confirmed at the branch. It does not change your price.
              </p>
            </div>

            {baskets.map((b, idx) => (
              <div key={b.basketKey} className='border border-blue-200'>
                <div className='bg-blue-600 px-6 py-4 flex items-center justify-between relative overflow-hidden'>
                  <div className='absolute top-0 left-0 w-full h-full pointer-events-none'
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%)' }} />
                  <div className='relative z-10'>
                    <span className='uppercase tracking-[0.35em] text-[10px] text-white/50 font-sans block mb-0.5'>Basket {idx + 1}</span>
                    <p className='text-white font-bold font-sans' style={{ letterSpacing: '-0.02em', fontSize: '18px' }}>{b.service.name}</p>
                  </div>
                  <span className='relative z-10 text-white font-bold font-sans text-sm'>₱{b.service.price.toFixed(2)}</span>
                </div>

                <div className='px-6 py-6'>
                  <SectionLabel>Estimated Weight <span className='text-red-400'>*</span></SectionLabel>
                  <p className='font-sans text-xs text-neutral-400 mb-3'>
                    Max 7kg per basket. If your load is heavier, split it into another basket in Step 1.
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {KG_OPTIONS.map(kg => (
                      <button key={kg} onClick={() => setBasketKg(b.basketKey, kg)}
                        className={`px-4 py-2 text-sm font-sans border transition-colors duration-200 ${
                          b.kg === kg ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-neutral-500 border-blue-100 hover:border-blue-400 hover:text-blue-700'
                        }`}
                        style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
                        {kg} kg{b.kg === kg && <span className='ml-1.5'>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className='border border-blue-100 px-6 py-6 space-y-6'>
              <div>
                <SectionLabel>Pickup Address <span className='text-red-400'>*</span></SectionLabel>
                <p className='font-sans text-xs text-neutral-400 mb-3'>One pickup address for all your baskets.</p>
                <div className='space-y-2'>
                  <input type='text' value={pickupAddress.line1}
                    onChange={e => setPickupAddress(p => ({ ...p, line1: e.target.value }))}
                    placeholder='House no., Street, Barangay' className={inputCls} />
                  <input type='text' value={pickupAddress.line2}
                    onChange={e => setPickupAddress(p => ({ ...p, line2: e.target.value }))}
                    placeholder='City, Province (optional)' className={inputCls} />
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <input type='checkbox' id='sameAddress' checked={sameAddress}
                  onChange={e => setSameAddress(e.target.checked)} className='w-4 h-4 accent-blue-600' />
                <label htmlFor='sameAddress' className='font-sans text-sm text-neutral-600'>
                  Delivery address is the same as pickup address
                </label>
              </div>
              {!sameAddress && (
                <div>
                  <SectionLabel>Delivery Address</SectionLabel>
                  <div className='space-y-2'>
                    <input type='text' value={deliveryAddress.line1}
                      onChange={e => setDeliveryAddress(d => ({ ...d, line1: e.target.value }))}
                      placeholder='House no., Street, Barangay' className={inputCls} />
                    <input type='text' value={deliveryAddress.line2}
                      onChange={e => setDeliveryAddress(d => ({ ...d, line2: e.target.value }))}
                      placeholder='City, Province (optional)' className={inputCls} />
                  </div>
                </div>
              )}
              <div>
                <SectionLabel>Special Instructions — optional</SectionLabel>
                <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)}
                  rows={3} placeholder='e.g. Handle with care, separate whites...'
                  className={inputCls + ' resize-none'} />
              </div>
            </div>

            <PriceBreakdown />
            <NavButtons backStep={1} onNext={goNext} />
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
  <div className='space-y-8'>
    <div>
      <SectionLabel>Step 03 — Optional Add-ons</SectionLabel>
      <Divider />
      <h2 className='leading-none text-blue-900 mb-2'
        style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
        Add-ons.
      </h2>
      <p className='font-sans text-sm text-neutral-400 mb-6'>
        {baskets.some(b => b.service.name.toLowerCase().includes('diy')) 
          ? 'Forgot to bring your own supplies? Buy them here.' 
          : 'Add extra detergents, conditioners, or other products.'}
        {' '}
        <span className='text-neutral-300'>Skip if you don't need any.</span>
      </p>
    </div>

            {productsList.length === 0 ? (
              <p className='font-sans text-sm text-neutral-400 py-6'>No add-on products available at this time.</p>
            ) : (
              Object.entries(productsByCategory).map(([cat, products]) => (
                <div key={cat}>
                  <SectionLabel>{CATEGORY_LABELS[cat] || cat}</SectionLabel>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
  {products.map(product => {
    const qty     = addOnQty[product.id] || 0
    const isAdded = qty > 0
    return (
      <div key={product.id}
        className={`flex items-center gap-4 p-4 border transition-colors duration-200 ${isAdded ? 'bg-blue-50 border-blue-400' : 'bg-white border-blue-100 hover:bg-blue-50/40'}`}>
                          {product.image
                            ? <img src={product.image} alt={product.name} className='w-12 h-12 object-cover flex-shrink-0' />
                            : <div className='w-12 h-12 bg-blue-100 flex items-center justify-center flex-shrink-0'>
                                <span className='text-blue-400 font-bold font-sans'>{product.name[0]?.toUpperCase()}</span>
                              </div>
                          }
                          <div className='flex-1 min-w-0'>
                            <p className='font-sans text-sm font-semibold text-neutral-700 truncate'>{product.name}</p>
                            <p className='font-sans text-xs text-blue-600 font-bold'>₱{product.price.toFixed(2)}</p>
                            {product.description && <p className='font-sans text-xs text-neutral-400 truncate'>{product.description}</p>}
                          </div>
                          <div className='flex items-center gap-2 flex-shrink-0'>
                            <button onClick={() => decrementQty(product.id)} disabled={qty === 0}
                              className={`w-7 h-7 font-sans font-bold text-sm flex items-center justify-center border transition-colors ${
                                qty > 0 ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white' : 'border-blue-100 text-blue-200 cursor-not-allowed'
                              }`}>−</button>
                            <input type='number' value={qty} onChange={e => setQty(product.id, e.target.value)}
                              className='w-8 text-center font-sans text-sm font-semibold border border-blue-100 focus:outline-none focus:border-blue-400 py-0.5'
                              min='0' max='99' />
                            <button onClick={() => incrementQty(product.id)}
                              className='w-7 h-7 font-sans font-bold text-sm flex items-center justify-center border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors'>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {selectedAddOns.length > 0 && (
              <div className='border border-blue-100 bg-blue-50/40 px-6 py-5'>
                <SectionLabel>Selected Add-ons</SectionLabel>
                <div className='font-sans text-sm space-y-1.5'>
                  {selectedAddOns.map(a => (
                    <div key={a.productId} className='flex justify-between text-neutral-600'>
                      <span>{a.name} × {a.quantity}</span>
                      <span className='font-medium'>₱{(a.price * a.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className='h-px bg-blue-200 my-1' />
                  <div className='flex justify-between text-blue-700 font-bold'>
                    <span>Add-ons Total</span><span>₱{addOnsTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <NavButtons backStep={2} onNext={goNext} nextLabel={selectedAddOns.length > 0 ? 'Next →' : 'Skip →'} />
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div className='space-y-8'>
            <div>
              <SectionLabel>Step 04 — Schedule & Confirm</SectionLabel>
              <Divider />
              <h2 className='leading-none text-blue-900 mb-8'
                style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                Confirm Booking.
              </h2>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
              <div>
                <SectionLabel>Pickup Date <span className='text-red-400'>*</span></SectionLabel>
                <input type='date' value={selectedDate}
                  onChange={e => {
                    const val = e.target.value
                    if (isPastDate(val)) { toast.error('That date has already passed.'); return }
                    setSelectedDate(val)
                  }}
                  min={getMinDate()} max={getMaxDate()} className={inputCls} />
                <p className='font-sans text-xs text-neutral-400 mt-1'>Available within 30 days from today.</p>
              </div>
              <div>
                <SectionLabel>Pickup Time <span className='text-red-400'>*</span> — 8:00 AM to 4:00 PM</SectionLabel>
                {!selectedDate ? (
                  <p className='font-sans text-xs text-neutral-400 py-3'>Please select a date first.</p>
                ) : availableSlots.length === 0 ? (
                  <div className='border border-amber-200 bg-amber-50 px-4 py-3 font-sans text-xs text-amber-600'>
                    No more available slots for today. Please select a different date.
                  </div>
                ) : (
                  <div className='flex flex-wrap gap-2'>
                    {availableSlots.map(slot => {
                      const full     = isSlotFull(selectedDate, slot)
                      const isChosen = selectedTime === slot
                      const [h, m]   = slot.split(':').map(Number)
                      const suffix   = h >= 12 ? 'PM' : 'AM'
                      const display  = `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m === 0 ? '00' : m} ${suffix}`
                      return (
                        <button key={slot} disabled={full} onClick={() => setSelectedTime(slot)}
                          className={`px-4 py-2 font-sans text-xs border transition-colors duration-200 ${
                            full    ? 'border-neutral-100 text-neutral-300 bg-neutral-50 cursor-not-allowed line-through'
                            : isChosen ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-neutral-600 border-blue-100 hover:border-blue-400 hover:text-blue-700'
                          }`}
                          style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 0 100%)' }}>
                          {display}{full && <span className='ml-1 text-[9px]'>Full</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <SectionLabel>Payment Method <span className='text-red-400'>*</span></SectionLabel>
              <p className='font-sans text-xs text-neutral-400 mb-4'>
                Cash, GCash, PayMaya, InstaPay, or BDO — final amount is confirmed after weighing at the branch.
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {PAYMENT_METHODS.map(opt => (
                  <button key={opt.value} onClick={() => setPreferredPaymentMethod(opt.value)}
                    className={`text-left px-5 py-4 border transition-colors duration-200 flex items-start gap-4 ${
                      preferredPaymentMethod === opt.value ? 'bg-blue-50 border-blue-600' : 'bg-white border-blue-100 hover:border-blue-300'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                    <div>
                      <p className={`font-sans text-sm font-bold ${preferredPaymentMethod === opt.value ? 'text-blue-700' : 'text-neutral-600'}`}>
                        {opt.label}{preferredPaymentMethod === opt.value && <span className='ml-2 text-blue-400'>✓</span>}
                      </p>
                      <p className='font-sans text-xs text-neutral-400 mt-0.5'>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Promo Code — optional</SectionLabel>
              {promoResult ? (
                <div className='flex items-center gap-4 border border-green-200 bg-green-50/60 px-5 py-4'>
                  <div className='flex-1 font-sans text-sm'>
                    <p className='font-bold text-green-700'>{promoResult.code} applied</p>
                    <p className='text-green-600 text-xs'>
                      You saved {currencySymbol}{promoResult.discountAmount.toFixed(2)}
                      {promoResult.discountType === 'percent' && ` (${promoResult.discountValue}% off)`}
                    </p>
                  </div>
                  <button onClick={removePromo}
                    className='font-sans text-xs text-neutral-400 hover:text-red-500 transition-colors uppercase tracking-widest'>
                    Remove
                  </button>
                </div>
              ) : (
                <div className='flex gap-0'>
                  <input value={promoInput}
                    onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                    onKeyDown={e => e.key === 'Enter' && applyPromo()}
                    placeholder='ENTER CODE'
                    className={`flex-1 px-4 py-3 border font-sans text-sm uppercase tracking-widest text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors ${promoError ? 'border-red-300 bg-red-50' : 'border-blue-100'}`}
                  />
                  <button onClick={applyPromo} disabled={promoLoading || !promoInput.trim()}
                    className='bg-blue-600 text-white px-6 font-sans text-xs tracking-widest uppercase font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {promoError && <p className='font-sans text-xs text-red-400 mt-1.5'>{promoError}</p>}
            </div>

            {selectedDate && selectedTime && !isSlotFull(selectedDate, selectedTime) && (
              <div className='border border-blue-100'>
                <div className='bg-blue-600 px-6 py-4 relative overflow-hidden'>
                  <div className='absolute top-0 left-0 w-full h-full pointer-events-none'
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
                  <span className='uppercase tracking-[0.35em] text-[10px] text-white/50 font-sans relative z-10 block mb-1'>Booking Summary</span>
                  <p className='text-white font-bold relative z-10' style={{ letterSpacing: '-0.02em', fontSize: '18px' }}>
                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {selectedTime}
                  </p>
                </div>
                <div className='px-6 py-5 space-y-5'>
                  {baskets.map((b, idx) => (
                    <div key={b.basketKey} className='border border-blue-50 bg-blue-50/40 px-4 py-3'>
                      <p className='font-sans text-xs font-bold text-blue-600 uppercase tracking-wider mb-2'>
                        Basket {idx + 1} — {b.service.name}
                      </p>
                      <div className='font-sans text-xs text-neutral-500'>
                        {b.kg && <p>Declared weight: {b.kg}kg</p>}
                      </div>
                    </div>
                  ))}
                  <div className='font-sans text-sm space-y-2 text-neutral-600'>
                    {selectedAddOns.length > 0 && (
                      <div>
                        <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Add-ons</span>
                        <p className='mt-0.5'>{selectedAddOns.map(a => `${a.name} ×${a.quantity}`).join(', ')}</p>
                      </div>
                    )}
                    {specialInstructions && (
                      <div>
                        <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Notes</span>
                        <p className='mt-0.5'>{specialInstructions}</p>
                      </div>
                    )}
                    <div>
                      <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Pickup</span>
                      <p className='mt-0.5'>{pickupAddress.line1}{pickupAddress.line2 ? ', ' + pickupAddress.line2 : ''}</p>
                    </div>
                    {!sameAddress && (
                      <div>
                        <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Delivery</span>
                        <p className='mt-0.5'>{deliveryAddress.line1}{deliveryAddress.line2 ? ', ' + deliveryAddress.line2 : ''}</p>
                      </div>
                    )}
                    <div>
                      <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Payment</span>
                      <p className='mt-0.5 font-semibold text-blue-700'>
                        {PAYMENT_METHODS.find(m => m.value === preferredPaymentMethod)?.label}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='px-6 pb-6'><PriceBreakdown /></div>
              </div>
            )}

            <NavButtons
              backStep={3}
              onNext={bookAppointment}
              nextLabel='Confirm Booking'
              disabled={!selectedDate || !selectedTime || isSlotFull(selectedDate, selectedTime)}
            />
          </div>
        )}
      </div>

      <RelatedBranches branchid={branchid} speciality={branchInfo.speciality?.[0]} />
    </div>
  )
}

export default Appointment