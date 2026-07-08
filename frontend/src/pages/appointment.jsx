import React, { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import RelatedBranches from '../components/RelatedBranches'
import axios from 'axios'
import { toast } from 'react-toastify'

const STEPS = ['Service', 'Pickup & Details', 'Add-ons', 'Schedule & Confirm']

const SOLO_SERVICES = ['Full Service']

const SERVICE_CLOTHING_SUGGESTIONS = {
  'Wash & Dry': [
    { label: 'Everyday Clothes', items: ['T-shirts', 'Jeans', 'Underwear', 'Socks', 'Casual tops'] },
    { label: 'Beddings', items: ['Bed sheets', 'Pillowcases', 'Blankets'] },
    { label: 'Gym Wear', items: ['Workout shirts', 'Shorts', 'Leggings', 'Sports bra'] },
  ],
  'Dry Clean': [
    { label: 'Formal Wear', items: ['Suits', 'Blazers', 'Dress shirts', 'Ties'] },
    { label: 'Delicates', items: ['Silk blouses', 'Evening gowns', 'Wool coats'] },
  ],
  'Iron Only': [
    { label: 'Office Wear', items: ['Dress shirts', 'Slacks', 'Blouses'] },
    { label: 'School Uniforms', items: ['Polo shirts', 'Pants', 'Skirts'] },
  ],
  'Fold Only': [
    { label: 'Clean Clothes', items: ['Shirts', 'Pants', 'Towels', 'Linens'] },
  ],
  'Full Service': [
    { label: 'All Types', items: ['Everyday clothes', 'Beddings', 'Delicates', 'Gym wear', 'Uniforms'] },
  ],
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00',
]

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const formatAddress = (address) => {
  if (!address) return null
  if (typeof address === 'string') return address
  return [address.line1, address.line2].filter(Boolean).join(', ')
}

const inputCls =
  'w-full px-4 py-3 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'

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

const defaultServiceDetail = () => ({
  clothingDescription: '',
  kg:            null,
  specialInstructions: '',
  extraServices: {},
})

const Appointment = () => {
  const { branchid } = useParams()
  const navigate = useNavigate()
  const { branches, currencySymbol, token, backendUrl, validatePromo } = useContext(AppContext)

  const [branchInfo, setBranchInfo] = useState(null)
  const [step, setStep]             = useState(1)

  const [servicesList,      setServicesList]      = useState([])
  const [kgRatesList,       setKgRatesList]       = useState([])
  const [extraServicesList, setExtraServicesList] = useState([])
  const [productsList,      setProductsList]      = useState([])
  const [allProducts,       setAllProducts]       = useState([])

  const [selectedServices, setSelectedServices] = useState([])
  const [serviceDetails,   setServiceDetails]   = useState({})

  const [sameAddress,         setSameAddress]         = useState(true)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [pickupAddress,       setPickupAddress]       = useState({ line1: '', line2: '' })
  const [deliveryAddress,     setDeliveryAddress]     = useState({ line1: '', line2: '' })

  const [addOnQty, setAddOnQty] = useState({})

  // ── Extra services per basket (step 3) ─────────────────────────────────────
  // { [serviceId]: { [extraServiceId]: true } }
  const [step3Extras, setStep3Extras] = useState({})

  const [selectedDate,           setSelectedDate]           = useState('')
  const [selectedTime,           setSelectedTime]           = useState('')
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('cash')

  const [vatRate, setVatRate] = useState(0)

  const [promoInput,   setPromoInput]   = useState('')
  const [promoResult,  setPromoResult]  = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError,   setPromoError]   = useState('')

  useEffect(() => {
    const found = branches.find(b => b._id === branchid)
    setBranchInfo(found)
  }, [branchid, branches])

  useEffect(() => { window.scrollTo(0, 0) }, [branchid])

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, k, v, p, inv, ex] = await Promise.all([
          axios.get(backendUrl + '/api/user/services'),
          axios.get(backendUrl + '/api/user/kg-rates'),
          axios.get(backendUrl + '/api/settings/vat'),
          axios.get(backendUrl + '/api/products/active'),
          axios.get(backendUrl + `/api/inventory/public/${branchid}/in-stock`),
          axios.get(backendUrl + '/api/extra-services/active'),
        ])
        if (s.data.success)  setServicesList(s.data.data.services)
        if (k.data.success)  setKgRatesList(k.data.data.kgRates)
        if (v.data.success)  setVatRate(v.data.data.vatRate ?? 0)
        if (ex.data.success) setExtraServicesList(ex.data.extraServices ?? [])
        if (p.data.success) {
          setAllProducts(p.data.data)
          if (inv.data?.success) {
            const inStock = new Set(inv.data.data.inStockIds)
            setProductsList(p.data.data.filter(prod => inStock.has(prod._id.toString())))
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
          setProductsList(p.data.data.filter(prod => inStock.has(prod._id.toString())))
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

  // ── Service detail helpers ──────────────────────────────────────────────────
  const getDetail = (serviceId) => serviceDetails[serviceId] || defaultServiceDetail()

  const setDetail = (serviceId, field, value) => {
    setServiceDetails(prev => ({
      ...prev,
      [serviceId]: { ...(prev[serviceId] || defaultServiceDetail()), [field]: value }
    }))
  }

  const toggleExtraService = (serviceId, extraId) => {
    const detail = getDetail(serviceId)
    const current = detail.extraServices || {}
    setDetail(serviceId, 'extraServices', {
      ...current,
      [extraId]: !current[extraId],
    })
  }

  const getExtraFeeForBasket = (serviceId) => {
    const chosen = getDetail(serviceId).extraServices || {}
    return (extraServicesList ?? []).reduce((sum, ex) => sum + (chosen[ex._id] ? ex.fee : 0), 0)
  }

  // ── Step 3 extra services helpers ──────────────────────────────────────────
  const toggleStep3Extra = (serviceId, extraId) => {
    setStep3Extras(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [extraId]: !(prev[serviceId]?.[extraId]),
      }
    }))
  }

  const getStep3ExtraFee = (serviceId) => {
    const chosen = step3Extras[serviceId] || {}
    return (extraServicesList ?? []).reduce((sum, ex) => sum + (chosen[ex._id] ? ex.fee : 0), 0)
  }

  const getStep3ExtraFeeTotal = () =>
    selectedServices.reduce((sum, s) => sum + getStep3ExtraFee(s._id), 0)

  // ── Totals ──────────────────────────────────────────────────────────────────
  const selectedAddOns = productsList
    .filter(p => addOnQty[p._id] > 0)
    .map(p => ({ productId: p._id, name: p.name, price: p.price, quantity: addOnQty[p._id] }))

  const servicesTotal  = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const kgPriceTotal   = selectedServices.reduce((sum, s) => sum + (getDetail(s._id).kg?.price || 0), 0)
  const extraTotal     = selectedServices.reduce((sum, s) => sum + getExtraFeeForBasket(s._id), 0)
  const step3ExtraTotal = getStep3ExtraFeeTotal()
  const addOnsTotal    = selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0)
  const totalAmount    = servicesTotal + kgPriceTotal + extraTotal + step3ExtraTotal + addOnsTotal
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
    if (!branchInfo?.slots_booked) return false
    const slots = branchInfo.slots_booked[date]
    if (!Array.isArray(slots)) return false
    return slots.filter(t => t === time).length >= 5
  }

  const availableSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : TIME_SLOTS

  const toggleService = (service) => {
    if (!token) { toast.warning('Please login first'); return navigate('/login') }
    const isSolo = SOLO_SERVICES.includes(service.name)
    setSelectedServices(prev => {
      const exists = prev.find(s => s._id === service._id)
      if (exists) {
        setServiceDetails(d => { const u = { ...d }; delete u[service._id]; return u })
        return prev.filter(s => s._id !== service._id)
      }
      if (isSolo) { setServiceDetails({}); return [service] }
      const soloAlreadySelected = prev.some(s => SOLO_SERVICES.includes(s.name))
      if (soloAlreadySelected) {
        toast.warning('Deselect "Full Service" first before adding other services')
        return prev
      }
      return [...prev, service]
    })
  }

  const setQty = (productId, value) => {
    const qty = Math.max(0, Math.min(99, parseInt(value) || 0))
    setAddOnQty(prev => ({ ...prev, [productId]: qty }))
  }
  const incrementQty = (productId) =>
    setAddOnQty(prev => ({ ...prev, [productId]: Math.min(99, (prev[productId] || 0) + 1) }))
  const decrementQty = (productId) =>
    setAddOnQty(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) - 1) }))

  const goNext = () => {
    if (step === 1 && selectedServices.length === 0)
      return toast.error('Please select at least one service')
    if (step === 2) {
      if (!pickupAddress.line1) return toast.error('Please enter your pickup address')
      for (const service of selectedServices) {
        const detail = getDetail(service._id)
        if (!detail.kg) return toast.error(`Please select weight for "${service.name}"`)
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
      const servicesPayload = selectedServices.map(s => {
        const detail  = getDetail(s._id)
        const chosen  = detail.extraServices || {}
        const step3   = step3Extras[s._id] || {}
        // merge step2 + step3 extras
        const allChosen = { ...chosen, ...step3 }
        const extras  = (extraServicesList ?? [])
          .filter(ex => allChosen[ex._id])
          .map(ex => ({ extraServiceId: ex._id, name: ex.name, fee: ex.fee }))
        return {
          serviceId:     s._id,
          kg:            detail.kg?.kg,
          extraServices: extras,
          extraFee:      extras.reduce((sum, ex) => sum + ex.fee, 0),
        }
      })

      const { data } = await axios.post(
        backendUrl + '/api/user/book-appointment',
        {
          branchId:               branchid,
          slotDate:               selectedDate,
          slotTime:               selectedTime,
          services:               servicesPayload,
          serviceIds:             selectedServices.map(s => s._id),
          clothingTypeIds:        [],
          kg:                     servicesPayload[0]?.kg,
          addOns:                 selectedAddOns,
          specialInstructions,
          pickupAddress,
          deliveryAddress:        sameAddress ? pickupAddress : deliveryAddress,
          promoCode:              promoResult?.code || null,
          preferredPaymentMethod,
        },
        { headers: { token } }
      )
      if (data.success) { toast.success(data.message); navigate('/my-appointments') }
      else toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
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
    <span className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans block mb-3'>
      {children}
    </span>
  )

  const Divider = () => <div className='h-px bg-violet-100 mb-6' />

  const PriceBreakdown = () => (
    <div className='border border-violet-100 bg-violet-50/40 px-6 py-5 mt-2'>
      <SectionLabel>Price Breakdown</SectionLabel>
      <div className='font-sans text-sm space-y-1.5'>
        {selectedServices.map((s, idx) => {
          const detail   = getDetail(s._id)
          const chosen   = detail.extraServices || {}
          const step3    = step3Extras[s._id] || {}
          const allChosen = { ...chosen, ...step3 }
          const extras   = (extraServicesList ?? []).filter(ex => allChosen[ex._id])
          const allExtraFee = (extraServicesList ?? []).reduce((sum, ex) => sum + (allChosen[ex._id] ? ex.fee : 0), 0)
          const basketTotal = s.price + (detail.kg?.price || 0) + allExtraFee
          return (
            <div key={s._id}>
              <div className='flex justify-between text-neutral-600'>
                <span>Basket {idx + 1} — {s.name}{detail.kg ? ` (${detail.kg.kg}kg)` : ''}</span>
                <span>₱{basketTotal.toFixed(2)}</span>
              </div>
              {extras.map(ex => (
                <div key={ex._id} className='flex justify-between text-violet-400 text-xs pl-3'>
                  <span>+ {ex.name}</span>
                  <span>₱{ex.fee.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )
        })}
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
        <div className='h-px bg-violet-200 my-1' />
        <div className='flex justify-between text-violet-700 font-bold text-base'>
          <span>Estimated Total</span><span>₱{finalAmount.toFixed(2)}</span>
        </div>
        <p className='font-sans text-[10px] text-neutral-400 mt-1'>
          Final amount will be confirmed after your laundry is weighed at the branch.
        </p>
      </div>
    </div>
  )

  const PillBtn = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-sans border transition-colors duration-200 ${
        active
          ? 'bg-violet-600 text-white border-violet-600'
          : 'bg-white text-neutral-500 border-violet-100 hover:border-violet-400 hover:text-violet-700'
      }`}
      style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
    >
      {children}
    </button>
  )

  const NavButtons = ({ backStep, onNext, nextLabel = 'Next →', disabled = false }) => (
    <div className='flex gap-3 pt-4'>
      {backStep && (
        <button
          onClick={() => goBack(backStep)}
          className='px-8 py-3 font-sans text-xs tracking-widest uppercase font-bold border border-violet-200 text-violet-400 hover:border-violet-400 hover:text-violet-600 transition-colors'
          style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          ← Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className='group relative overflow-hidden bg-violet-600 text-white px-10 py-3 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed'
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
      >
        <span className='relative z-10'>{nextLabel}</span>
        <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
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
          <div className='flex-1 bg-violet-600 px-8 md:px-12 py-10 flex flex-col justify-center gap-4 relative overflow-hidden'>
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
                  isDone   ? 'bg-violet-600 border-violet-600' :
                  isActive ? 'bg-violet-50 border-violet-400' :
                             'bg-white border-violet-100'
                }`}>
                  <span className={`font-sans text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isDone   ? 'bg-white text-violet-600' :
                    isActive ? 'bg-violet-600 text-white' :
                               'bg-violet-100 text-violet-300'
                  }`}>
                    {isDone ? '✓' : num}
                  </span>
                  <span className={`font-sans text-xs uppercase tracking-widest hidden sm:block ${
                    isDone ? 'text-white' : isActive ? 'text-violet-700 font-bold' : 'text-violet-200'
                  }`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 max-w-[32px] ${step > num ? 'bg-violet-600' : 'bg-violet-100'}`} />
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
            <h2 className='leading-none text-violet-900 mb-4'
              style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Select Service.
            </h2>
            <p className='font-sans text-xs text-neutral-400 mb-8'>
              You can select multiple services — each gets its own basket.{' '}
              <span className='text-violet-400 font-bold'>Full Service</span> cannot be combined with others.
            </p>

            <div className='flex flex-wrap gap-2 mb-6'>
              {servicesList.map(service => {
                const isSelected          = !!selectedServices.find(s => s._id === service._id)
                const isSoloActive        = selectedServices.some(s => SOLO_SERVICES.includes(s.name))
                const isThisSolo          = SOLO_SERVICES.includes(service.name)
                const soloBlockedByOthers = isThisSolo && selectedServices.length > 0 && !isSelected
                const otherBlockedBySolo  = !isThisSolo && isSoloActive
                const blocked = soloBlockedByOthers || otherBlockedBySolo
                return (
                  <button key={service._id} onClick={() => toggleService(service)}
                    className={`px-4 py-2 text-sm font-sans border transition-colors duration-200 ${
                      isSelected  ? 'bg-violet-600 text-white border-violet-600'
                      : blocked   ? 'bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed'
                      : 'bg-white text-neutral-500 border-violet-100 hover:border-violet-400 hover:text-violet-700'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                  >
                    {service.name}
                    <span className='ml-2 opacity-60 font-sans text-xs'>₱{service.price}</span>
                    {isSelected && <span className='ml-1.5'>✓</span>}
                    {isThisSolo && !isSelected && !blocked && (
                      <span className='ml-2 font-sans text-[9px] uppercase tracking-wider opacity-50'>solo</span>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedServices.length > 0 && (
              <div className='border border-violet-100 bg-violet-50/40 px-6 py-4 mb-6 font-sans text-sm'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-neutral-400 uppercase tracking-widest text-[10px]'>Selected Services</span>
                  <span className='text-violet-400 text-xs'>{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''}</span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {selectedServices.map(s => (
                    <span key={s._id} className='inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1 font-sans text-xs font-bold'>
                      {s.name}<span className='text-violet-400'>₱{s.price}</span>
                    </span>
                  ))}
                </div>
                <div className='h-px bg-violet-100 my-3' />
                <div className='flex justify-between'>
                  <span className='text-neutral-500'>Services Total</span>
                  <span className='text-violet-700 font-bold'>₱{servicesTotal}</span>
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
              <SectionLabel>Step 02 — Pickup & Laundry Details</SectionLabel>
              <Divider />
              <h2 className='leading-none text-violet-900 mb-4'
                style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                Your Details.
              </h2>
              <p className='font-sans text-xs text-neutral-400'>
                Each service has its own basket — fill in the details separately.
              </p>
            </div>

            {selectedServices.map((service, idx) => {
              const detail = getDetail(service._id)
              const chosen = detail.extraServices || {}
              return (
                <div key={service._id} className='border border-violet-200'>
                  <div className='bg-violet-600 px-6 py-4 flex items-center justify-between relative overflow-hidden'>
                    <div className='absolute top-0 left-0 w-full h-full pointer-events-none'
                      style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%)' }} />
                    <div className='relative z-10'>
                      <span className='uppercase tracking-[0.35em] text-[10px] text-white/50 font-sans block mb-0.5'>Basket {idx + 1}</span>
                      <p className='text-white font-bold font-sans' style={{ letterSpacing: '-0.02em', fontSize: '18px' }}>{service.name}</p>
                    </div>
                    <span className='relative z-10 text-white font-bold font-sans text-sm'>₱{service.price}</span>
                  </div>

                  <div className='px-6 py-6 space-y-6'>
                    {SERVICE_CLOTHING_SUGGESTIONS[service.name] && (
                      <div>
                        <SectionLabel>What to put in this basket</SectionLabel>
                        <div className='flex flex-col gap-2'>
                          {SERVICE_CLOTHING_SUGGESTIONS[service.name].map((group, gi) => (
                            <div key={gi} className='border border-violet-50 bg-violet-50/50 px-4 py-3'>
                              <span className='font-sans text-[10px] font-bold text-violet-500 uppercase tracking-wider block mb-1.5'>{group.label}</span>
                              <div className='flex flex-wrap gap-x-4 gap-y-1'>
                                {group.items.map((item, ii) => (
                                  <span key={ii} className='flex items-center gap-1.5 font-sans text-xs text-neutral-500'>
                                    <span className='w-1 h-1 rounded-full bg-violet-300 flex-shrink-0' />{item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <SectionLabel>Estimated Weight <span className='text-red-400'>*</span></SectionLabel>
                      <p className='font-sans text-xs text-neutral-400 mb-3'>Max 7kg per basket.</p>
                      <div className='flex flex-wrap gap-2'>
                        {kgRatesList.map(rate => (
                          <PillBtn key={rate._id} active={detail.kg?._id === rate._id}
                            onClick={() => setDetail(service._id, 'kg', rate)}>
                            {rate.kg} kg
                            <span className='ml-2 opacity-60 font-sans text-xs'>₱{rate.price}</span>
                            {detail.kg?._id === rate._id && <span className='ml-1.5'>✓</span>}
                          </PillBtn>
                        ))}
                      </div>
                    </div>

                    {extraServicesList.length > 0 && (
                      <div>
                        <SectionLabel>Extra Services — optional</SectionLabel>
                        <div className='flex flex-col gap-2'>
                          {extraServicesList.map(ex => {
                            const isOn = !!chosen[ex._id]
                            return (
                              <button key={ex._id} onClick={() => toggleExtraService(service._id, ex._id)}
                                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left border transition-colors duration-200 ${
                                  isOn ? 'bg-violet-600 border-violet-600' : 'bg-white border-violet-100 hover:border-violet-300 hover:bg-violet-50/40'
                                }`}>
                                <div className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${isOn ? 'bg-white/30' : 'bg-violet-100'}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${isOn ? 'left-5 bg-white' : 'left-0.5 bg-violet-400'}`} />
                                </div>
                                <div className='flex-1'>
                                  <p className={`font-sans text-sm font-bold ${isOn ? 'text-white' : 'text-neutral-700'}`}>{ex.name}</p>
                                  {ex.description && <p className={`font-sans text-xs mt-0.5 ${isOn ? 'text-white/70' : 'text-neutral-400'}`}>{ex.description}</p>}
                                </div>
                                <span className={`font-sans font-black text-sm flex-shrink-0 ${isOn ? 'text-white' : 'text-violet-400'}`}>
                                  {isOn ? `+₱${ex.fee} ✓` : `+₱${ex.fee}`}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {detail.kg && (
                      <div className='bg-violet-50 border border-violet-100 px-4 py-3 font-sans text-xs'>
                        <div className='flex justify-between'>
                          <span className='text-neutral-500'>Basket {idx + 1} subtotal</span>
                          <span className='text-violet-700 font-bold'>
                            ₱{(service.price + detail.kg.price + getExtraFeeForBasket(service._id)).toFixed(2)}
                          </span>
                        </div>
                        {Object.values(chosen).some(Boolean) && (
                          <p className='text-neutral-400 mt-1'>
                            Includes: {extraServicesList.filter(ex => chosen[ex._id]).map(ex => ex.name).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div className='border border-violet-100 px-6 py-6 space-y-6'>
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
                  onChange={e => setSameAddress(e.target.checked)} className='w-4 h-4 accent-violet-600' />
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
              <h2 className='leading-none text-violet-900 mb-2'
                style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
                Add-ons.
              </h2>
              <p className='font-sans text-sm text-neutral-400 mb-6'>
                Add detergents, conditioners, or other products.{' '}
                <span className='text-neutral-300'>Skip if you don't need any.</span>
              </p>
            </div>

            {/* ── EXTRA SERVICES (per basket) ── */}
            {extraServicesList.length > 0 && (
              <div>
                <SectionLabel>Extra Services — optional</SectionLabel>
                <p className='font-sans text-xs text-neutral-400 mb-4'>
                  Select extra services per basket. These will be added to your final bill.
                </p>
                <div className='space-y-4'>
                  {selectedServices.map((service, idx) => {
                    const chosen = step3Extras[service._id] || {}
                    return (
                      <div key={service._id} className='border border-violet-100'>
                        <div className='bg-violet-50 px-5 py-3 border-b border-violet-100 flex items-center justify-between'>
                          <span className='font-sans text-xs font-bold text-violet-600 uppercase tracking-wider'>
                            Basket {idx + 1} — {service.name}
                          </span>
                          {getStep3ExtraFee(service._id) > 0 && (
                            <span className='font-sans text-xs font-black text-violet-600'>
                              +₱{getStep3ExtraFee(service._id).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className='divide-y divide-violet-50'>
                          {extraServicesList.map(ex => {
                            const isOn = !!chosen[ex._id]
                            return (
                              <button key={ex._id} onClick={() => toggleStep3Extra(service._id, ex._id)}
                                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors duration-200 ${
                                  isOn ? 'bg-violet-600' : 'bg-white hover:bg-violet-50/40'
                                }`}>
                                <div className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 ${isOn ? 'bg-white/30' : 'bg-violet-100'}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${isOn ? 'left-5 bg-white' : 'left-0.5 bg-violet-400'}`} />
                                </div>
                                <div className='flex-1'>
                                  <p className={`font-sans text-sm font-bold ${isOn ? 'text-white' : 'text-neutral-700'}`}>{ex.name}</p>
                                  {ex.description && (
                                    <p className={`font-sans text-xs mt-0.5 ${isOn ? 'text-white/70' : 'text-neutral-400'}`}>{ex.description}</p>
                                  )}
                                </div>
                                <span className={`font-sans font-black text-sm flex-shrink-0 ${isOn ? 'text-white' : 'text-violet-400'}`}>
                                  {isOn ? `+₱${ex.fee} ✓` : `+₱${ex.fee}`}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {productsList.length === 0 ? (
              <p className='font-sans text-sm text-neutral-400 py-6'>No add-on products available at this time.</p>
            ) : (
              Object.entries(productsByCategory).map(([cat, products]) => (
                <div key={cat}>
                  <SectionLabel>{CATEGORY_LABELS[cat] || cat}</SectionLabel>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-px bg-violet-100'>
                    {products.map(product => {
                      const qty     = addOnQty[product._id] || 0
                      const isAdded = qty > 0
                      return (
                        <div key={product._id}
                          className={`flex items-center gap-4 p-4 transition-colors duration-200 ${isAdded ? 'bg-violet-50' : 'bg-white hover:bg-violet-50/40'}`}>
                          {product.image
                            ? <img src={product.image} alt={product.name} className='w-12 h-12 object-cover flex-shrink-0' />
                            : <div className='w-12 h-12 bg-violet-100 flex items-center justify-center flex-shrink-0'>
                                <span className='text-violet-400 font-bold font-sans'>{product.name[0]?.toUpperCase()}</span>
                              </div>
                          }
                          <div className='flex-1 min-w-0'>
                            <p className='font-sans text-sm font-semibold text-neutral-700 truncate'>{product.name}</p>
                            <p className='font-sans text-xs text-violet-600 font-bold'>₱{product.price.toFixed(2)}</p>
                            {product.description && <p className='font-sans text-xs text-neutral-400 truncate'>{product.description}</p>}
                          </div>
                          <div className='flex items-center gap-2 flex-shrink-0'>
                            <button onClick={() => decrementQty(product._id)} disabled={qty === 0}
                              className={`w-7 h-7 font-sans font-bold text-sm flex items-center justify-center border transition-colors ${
                                qty > 0 ? 'border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white' : 'border-violet-100 text-violet-200 cursor-not-allowed'
                              }`}>−</button>
                            <input type='number' value={qty} onChange={e => setQty(product._id, e.target.value)}
                              className='w-8 text-center font-sans text-sm font-semibold border border-violet-100 focus:outline-none focus:border-violet-400 py-0.5'
                              min='0' max='99' />
                            <button onClick={() => incrementQty(product._id)}
                              className='w-7 h-7 font-sans font-bold text-sm flex items-center justify-center border border-violet-600 text-violet-600 hover:bg-violet-600 hover:text-white transition-colors'>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {selectedAddOns.length > 0 && (
              <div className='border border-violet-100 bg-violet-50/40 px-6 py-5'>
                <SectionLabel>Selected Add-ons</SectionLabel>
                <div className='font-sans text-sm space-y-1.5'>
                  {selectedAddOns.map(a => (
                    <div key={a.productId} className='flex justify-between text-neutral-600'>
                      <span>{a.name} × {a.quantity}</span>
                      <span className='font-medium'>₱{(a.price * a.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className='h-px bg-violet-200 my-1' />
                  <div className='flex justify-between text-violet-700 font-bold'>
                    <span>Add-ons Total</span><span>₱{addOnsTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <NavButtons backStep={2} onNext={goNext} nextLabel={selectedAddOns.length > 0 || step3ExtraTotal > 0 ? 'Next →' : 'Skip →'} />
          </div>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div className='space-y-8'>
            <div>
              <SectionLabel>Step 04 — Schedule & Confirm</SectionLabel>
              <Divider />
              <h2 className='leading-none text-violet-900 mb-8'
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
                            : isChosen ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-neutral-600 border-violet-100 hover:border-violet-400 hover:text-violet-700'
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
                Final amount will be confirmed after weighing.
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {[
                  { value: 'cash',   label: 'Cash on Delivery', icon: '', desc: 'Pay in cash when your laundry is delivered.' },
                  { value: 'online', label: 'Online Payment',   icon: '', desc: 'Pay via GCash or card. A payment link will be sent once your laundry is weighed.' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setPreferredPaymentMethod(opt.value)}
                    className={`text-left px-5 py-4 border transition-colors duration-200 flex items-start gap-4 ${
                      preferredPaymentMethod === opt.value ? 'bg-violet-50 border-violet-600' : 'bg-white border-violet-100 hover:border-violet-300'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                    <span className='text-2xl flex-shrink-0 mt-0.5'>{opt.icon}</span>
                    <div>
                      <p className={`font-sans text-sm font-bold ${preferredPaymentMethod === opt.value ? 'text-violet-700' : 'text-neutral-600'}`}>
                        {opt.label}{preferredPaymentMethod === opt.value && <span className='ml-2 text-violet-400'>✓</span>}
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
                    className={`flex-1 px-4 py-3 border font-sans text-sm uppercase tracking-widest text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors ${promoError ? 'border-red-300 bg-red-50' : 'border-violet-100'}`}
                  />
                  <button onClick={applyPromo} disabled={promoLoading || !promoInput.trim()}
                    className='bg-violet-600 text-white px-6 font-sans text-xs tracking-widest uppercase font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              {promoError && <p className='font-sans text-xs text-red-400 mt-1.5'>{promoError}</p>}
            </div>

            {selectedDate && selectedTime && !isSlotFull(selectedDate, selectedTime) && (
              <div className='border border-violet-100'>
                <div className='bg-violet-600 px-6 py-4 relative overflow-hidden'>
                  <div className='absolute top-0 left-0 w-full h-full pointer-events-none'
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
                  <span className='uppercase tracking-[0.35em] text-[10px] text-white/50 font-sans relative z-10 block mb-1'>Booking Summary</span>
                  <p className='text-white font-bold relative z-10' style={{ letterSpacing: '-0.02em', fontSize: '18px' }}>
                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {selectedTime}
                  </p>
                </div>
                <div className='px-6 py-5 space-y-5'>
                  {selectedServices.map((service, idx) => {
                    const detail  = getDetail(service._id)
                    const chosen  = detail.extraServices || {}
                    const step3   = step3Extras[service._id] || {}
                    const allChosen = { ...chosen, ...step3 }
                    const extras  = (extraServicesList ?? []).filter(ex => allChosen[ex._id])
                    return (
                      <div key={service._id} className='border border-violet-50 bg-violet-50/40 px-4 py-3'>
                        <p className='font-sans text-xs font-bold text-violet-600 uppercase tracking-wider mb-2'>
                          Basket {idx + 1} — {service.name}
                        </p>
                        <div className='font-sans text-xs text-neutral-500 space-y-1'>
                          {detail.kg && <p>Weight: {detail.kg.kg}kg</p>}
                          {extras.map(ex => (
                            <p key={ex._id} className='text-violet-500 font-semibold'>+ {ex.name} (₱{ex.fee})</p>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
                      <p className='mt-0.5 font-semibold text-violet-700'>
                        {preferredPaymentMethod === 'cash' ? 'Cash on Delivery' : 'Online Payment'}
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

      <RelatedBranches branchid={branchid} speciality={branchInfo.speciality[0]} />
    </div>
  )
}

export default Appointment