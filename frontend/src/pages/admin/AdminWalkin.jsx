import { useEffect, useContext, useState, useRef } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2">{children}</p>
)
const Divider = () => <div className="h-px bg-blue-100 mb-6" />

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

// ─── VALIDATION HELPERS ──────────────────────────────────────────
const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 11 && digits.startsWith('09')
}

const validateName = (name) => {
  return /^[A-Za-z\s.\-']{2,}$/.test(name.trim())
}

const AdminWalkIn = () => {
  const {
    aToken, backendUrl,
    branches, getAllBranches,
    walkInServices, getWalkInServices,
    lookupPhone, createWalkInAppointment,
    generateQrPayment, getQrPaymentStatus,
    confirmPayment,
  } = useContext(AdminContext)

  useEffect(() => { if (aToken) { getAllBranches(); getWalkInServices() } }, [aToken])

  // ─── Branch selection ───────────────────────────────────────────
  const [branchId, setBranchId] = useState('')

  // ─── Add-ons / Extra Products ────────────────────────────────
  const [productsList, setProductsList] = useState([])
  const [addOnQty, setAddOnQty] = useState({})

  const CATEGORY_LABELS = {
    detergent:   'Detergents',
    conditioner: 'Conditioners',
    other:       'Others',
  }

  const productsByCategory = productsList.reduce((acc, p) => {
    const cat = p.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const selectedAddOns = productsList
    .filter(p => addOnQty[p.id] > 0)
    .map(p => ({ productId: p.id, name: p.name, price: p.price, quantity: addOnQty[p.id] }))
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0)

  const setQty = (productId, value) => {
    const qty = Math.max(0, Math.min(99, parseInt(value) || 0))
    setAddOnQty(prev => ({ ...prev, [productId]: qty }))
  }
  const incrementQty = (productId) =>
    setAddOnQty(prev => ({ ...prev, [productId]: Math.min(99, (prev[productId] || 0) + 1) }))
  const decrementQty = (productId) =>
    setAddOnQty(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) - 1) }))

  // Fetch products + branch inventory whenever branch changes
  useEffect(() => {
    if (!branchId) { setProductsList([]); return }
    Promise.all([
      axios.get(backendUrl + '/api/products/active'),
      axios.get(backendUrl + `/api/inventory/public/${branchId}/in-stock`),
    ]).then(([p, inv]) => {
      if (p.data?.success) {
        if (inv.data?.success) {
          const inStock = new Set(inv.data.data.inStockIds)
          setProductsList(p.data.data.filter(prod => inStock.has(prod.id.toString())))
        } else {
          setProductsList(p.data.data)
        }
      }
    }).catch(() => setProductsList([]))
  }, [branchId, backendUrl])

  // ─── Phone lookup ───────────────────────────────────────────────
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [guestName, setGuestName]   = useState('')
  const [nameError, setNameError]   = useState('')
  const [foundUser, setFoundUser]   = useState(null)
  const [lookupState, setLookupState] = useState('idle')
  const lookupTimer = useRef(null)

  useEffect(() => {
    if (phone && phone.trim().length > 0) {
      if (!validatePhone(phone.trim())) {
        setPhoneError('Please enter a valid mobile number (e.g. 09171234567)')
      } else {
        setPhoneError('')
      }
    } else {
      setPhoneError('')
    }
  }, [phone])

  useEffect(() => {
    if (guestName && guestName.trim().length > 0) {
      if (!validateName(guestName)) {
        setNameError('Name should only contain letters, spaces, dots, hyphens, or apostrophes')
      } else {
        setNameError('')
      }
    } else {
      setNameError('')
    }
  }, [guestName])

  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    if (!phone || phone.trim().length < 7 || phoneError) {
      setLookupState('idle')
      setFoundUser(null)
      return
    }
    setLookupState('loading')
    lookupTimer.current = setTimeout(async () => {
      const user = await lookupPhone(phone.trim())
      if (user) {
        setFoundUser(user)
        setLookupState('found')
        setGuestName(user.name)
      } else {
        setFoundUser(null)
        setLookupState('not_found')
      }
    }, 500)
    return () => clearTimeout(lookupTimer.current)
  }, [phone, phoneError])

  // ─── Basket / services selection ────────────────────────────────
  const [baskets, setBaskets] = useState([{ serviceId: '', actualKg: '' }])

  const addBasket    = () => setBaskets(prev => [...prev, { serviceId: '', actualKg: '' }])
  const removeBasket = (idx) => setBaskets(prev => prev.filter((_, i) => i !== idx))
  const updateBasket = (idx, field, value) =>
    setBaskets(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))

  const getServicePrice = (serviceId) =>
    walkInServices.find(s => s.id === serviceId)?.price || 0

  const estimatedTotal = baskets.reduce((sum, b) => sum + getServicePrice(b.serviceId), 0)
    + productsList.filter(p => addOnQty[p.id] > 0).reduce((sum, p) => sum + p.price * addOnQty[p.id], 0)

  const anyOverweight = baskets.some(b => Number(b.actualKg) > 7)

  const [overweightResolution, setOverweightResolution] = useState('')
  const [fulfillmentMethod, setFulfillmentMethod] = useState('SELF_PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')  // ← NEW

  const [paymentMethod, setPaymentMethod] = useState('CASH')

  // ─── Promo auto-apply preview ──────────────────────────────────
  const autoPromo = (() => {
    if (!foundUser) return null
    const stamps = foundUser.loyaltyStamps || 0
    if (stamps >= 10 && foundUser.tenthStampReward?.code) {
      return { ...foundUser.tenthStampReward, tier: '10th' }
    }
    if (stamps >= 5 && stamps < 10 && foundUser.fifthStampReward?.code && !foundUser.fifthStampRedeemedAt) {
      return { ...foundUser.fifthStampReward, tier: '5th' }
    }
    return null
  })()

  const discountAmount = autoPromo
    ? autoPromo.discountType === 'percent'
      ? estimatedTotal * (autoPromo.discountValue / 100)
      : autoPromo.discountValue
    : 0

  const finalEstimate = Math.max(0, estimatedTotal - discountAmount)

  // ─── Submit ───────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // ─── QR PAYMENT STATES ──────────────────────────────────────────
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [isPolling, setIsPolling] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [createdAppointmentId, setCreatedAppointmentId] = useState('')
  const [qrError, setQrError] = useState('')
  const pollTimer = useRef(null)

  const resetForm = () => {
    setBranchId('')
    setPhone(''); setPhoneError(''); setGuestName(''); setNameError(''); setFoundUser(null); setLookupState('idle')
    setBaskets([{ serviceId: '', actualKg: '' }])
    setOverweightResolution('')
    setFulfillmentMethod('SELF_PICKUP')
    setDeliveryAddress('')   // ← NEW
    setPaymentMethod('CASH')
    setAddOnQty({})   // ← NEW
  }

  const hasIncompleteBasket = baskets.some(b => b.actualKg && !b.serviceId)
  const hasServiceNoWeight = baskets.some(b => b.serviceId && !b.actualKg)
  const hasInvalidWeight = baskets.some(b => b.actualKg && Number(b.actualKg) < 0)

  const canSubmit =
    branchId.trim().length > 0 &&
    phone.trim().length >= 7 &&
    !phoneError &&
    guestName.trim().length >= 2 &&
    !nameError &&
    baskets.length > 0 &&
    baskets.every(b => b.serviceId && Number(b.actualKg) >= 1) &&
    !hasIncompleteBasket &&
    !hasServiceNoWeight &&
    !hasInvalidWeight &&
    (!anyOverweight || overweightResolution)

  // ─── SPLIT LOAD — expands overweight baskets into 7kg chunks ────
  const handleSplitLoad = () => {
    const newBaskets = []

    for (const basket of baskets) {
      const weight = Number(basket.actualKg)

      if (weight <= 7) {
        // Not overweight, keep as-is
        newBaskets.push(basket)
      } else {
        // Overweight: split into multiple baskets
        // First basket: 7kg
        newBaskets.push({
          serviceId: basket.serviceId,
          actualKg: 7,
        })

        // Remaining weight: create additional 7kg baskets (loop until used up)
        let remaining = weight - 7
        while (remaining > 0) {
          const basketKg = parseFloat(Math.min(7, remaining).toFixed(2))
          newBaskets.push({
            serviceId: basket.serviceId,
            actualKg: basketKg,
          })
          remaining -= basketKg
        }
      }
    }

    setBaskets(newBaskets)
    setOverweightResolution('split')
  }

  // ─── QR: Open modal + generate QR + start polling ───────────────
  const openQrFlow = async (appointmentId) => {
    setShowQrModal(true)
    setQrError('')
    setPaymentConfirmed(false)
    setQrImageUrl('')

    const res = await generateQrPayment(appointmentId)
    if (!res || !res.qrImageUrl) {
      setQrError('Could not generate QR code. Please try again.')
      return
    }
    setQrImageUrl(res.qrImageUrl)
    setIsPolling(true)
  }

  // ─── QR: Polling effect ─────────────────────────────────────────
  useEffect(() => {
    if (!isPolling || !createdAppointmentId) return

    const poll = async () => {
      const status = await getQrPaymentStatus(createdAppointmentId)
      const paid = status?.paid === true || status?.payment === true
      if (paid) {
        await confirmPayment(createdAppointmentId, 'online')

        setPaymentConfirmed(true)
        setIsPolling(false)
        setSuccessMsg('Payment confirmed! Walk-in appointment is fully paid.')
        setTimeout(() => {
          setShowQrModal(false)
          resetForm()
          setCreatedAppointmentId('')
          setQrImageUrl('')
          setPaymentConfirmed(false)
        }, 2500)
      }
    }

    poll()
    pollTimer.current = setInterval(poll, 4000)

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [isPolling, createdAppointmentId, confirmPayment])

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [])

  const closeQrModal = () => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    setIsPolling(false)
    setShowQrModal(false)
    setQrImageUrl('')
    setQrError('')
    setPaymentConfirmed(false)
    setCreatedAppointmentId('')
    resetForm()
    setSuccessMsg('Walk-in appointment created. QR payment pending — client can still pay later.')
  }

  // ─── Auto-fill address when DELIVERY selected + user found ──
  useEffect(() => {
    if (fulfillmentMethod === 'DELIVERY' && foundUser?.address) {
      setDeliveryAddress(foundUser.address)
    } else if (fulfillmentMethod === 'SELF_PICKUP') {
      setDeliveryAddress('')
    }
  }, [fulfillmentMethod, foundUser])

  // ─── SUBMIT (with promo auto-apply) ─────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSuccessMsg('')

    // Auto-apply milestone reward if exists (10th priority > 5th)
    let promoCodeToApply = null
    const stamps = foundUser?.loyaltyStamps || 0
    if (stamps >= 10 && foundUser?.tenthStampReward?.code) {
      promoCodeToApply = foundUser.tenthStampReward.code
    } else if (stamps >= 5 && stamps < 10 && foundUser?.fifthStampReward?.code && !foundUser?.fifthStampRedeemedAt) {
      promoCodeToApply = foundUser.fifthStampReward.code
    }

    const payload = {
      branchId,
      phone: phone.trim(),
      guestName: guestName.trim() || null,
      services: baskets.map(b => ({ serviceId: b.serviceId, actualKg: Number(b.actualKg) })),
      overweightResolution: anyOverweight ? overweightResolution : null,
      fulfillmentMethod,
      paymentMethod,
      promoCode: promoCodeToApply,
      address: deliveryAddress.trim() || null,
      addOns: selectedAddOns,  // ← NEW
    }

    const ok = await createWalkInAppointment(payload)
    setSubmitting(false)

    if (ok) {
      if (paymentMethod === 'ONLINE') {
        const appointmentId = ok.id || ok.appointmentId || ok._id
        setCreatedAppointmentId(appointmentId)
        openQrFlow(appointmentId)
      } else {
        setSuccessMsg('Walk-in appointment created! Client will now appear under All Appointments.')
        resetForm()
      }
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white"
  const inputErrorClass = "w-full px-4 py-2.5 border border-red-300 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-red-400 transition-colors bg-white"
  const selectClass = "w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white appearance-none cursor-pointer"
  const selectErrorClass = "w-full px-4 py-2.5 border border-red-300 font-sans text-sm text-neutral-700 focus:outline-none focus:border-red-400 transition-colors bg-white appearance-none cursor-pointer"

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-white">
      <div className="px-10 pt-10 pb-12" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-3">Super Admin</p>
        <h1 className="text-white" style={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>Walk-In</h1>
        <p className="font-sans text-sm text-blue-300 mt-2">Create an appointment for a client at any branch</p>
      </div>

      <div className="px-10 py-10 max-w-3xl mx-auto">

        {successMsg && (
          <div className="mb-8 bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
            <span className="text-green-600 text-lg">✓</span>
            <p className="font-sans text-sm text-green-700">{successMsg}</p>
          </div>
        )}

        {/* ─── BRANCH SELECTION ───────────────────────────────── */}
        <SectionLabel>Branch</SectionLabel>
        <Divider />
        <div className="mb-10">
          <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">Select Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className={!branchId ? selectErrorClass : selectClass}>
            <option value="">Choose a branch...</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!branchId && (
            <p className="font-sans text-xs text-amber-600 mt-1.5">Please select a branch before continuing.</p>
          )}
        </div>

        {/* ─── CLIENT INFO ─────────────────────────────────────── */}
        <SectionLabel>Client Info</SectionLabel>
        <Divider />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          <div>
            <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 11)
                setPhone(value)
              }}
              placeholder="e.g. 09171234567" 
              className={phoneError ? inputErrorClass : inputClass} 
              maxLength={11}
            />
            {phoneError && <p className="font-sans text-xs text-red-500 mt-1.5">{phoneError}</p>}
            {lookupState === 'loading' && <p className="font-sans text-xs text-neutral-400 mt-1.5">Checking...</p>}
            {lookupState === 'found' && (
              <p className="font-sans text-xs text-blue-600 mt-1.5">✓ Existing customer: {foundUser.name}</p>
            )}
            {lookupState === 'not_found' && (
              <p className="font-sans text-xs text-amber-600 mt-1.5">New customer — a profile will be created</p>
            )}
          </div>
          <div>
            <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">
              Name {lookupState === 'found' && <span className="text-neutral-300 normal-case">(from record)</span>}
            </label>
            <input 
              type="text" 
              value={guestName} 
              onChange={e => {
                const value = e.target.value.replace(/[^A-Za-z\s.\-']/g, '')
                setGuestName(value)
              }}
              disabled={lookupState === 'found'}
              placeholder="Client name" 
              className={nameError ? inputErrorClass : `${inputClass} disabled:bg-neutral-50 disabled:text-neutral-400`} 
            />
            {nameError && <p className="font-sans text-xs text-red-500 mt-1.5">{nameError}</p>}
            {!nameError && guestName && guestName.trim().length > 0 && guestName.trim().length < 2 && (
              <p className="font-sans text-xs text-amber-500 mt-1.5">Name must be at least 2 characters</p>
            )}
          </div>
        </div>

        {/* ─── LOYALTY STAMP PREVIEW (if existing customer) ─────── */}
        {foundUser && lookupState === 'found' && (
          <>
            <SectionLabel>Customer Loyalty</SectionLabel>
            <Divider />
            <div className="mb-10 bg-blue-50 border border-blue-100 px-5 py-4">
              <div className="grid grid-cols-5 gap-3 mb-4">
                {Array.from({ length: 10 }, (_, i) => {
                  const stampNum = i + 1
                  const filled = stampNum <= (foundUser.loyaltyStamps || 0)
                  return (
                    <div
                      key={stampNum}
                      className={`aspect-square flex items-center justify-center border-2 font-sans text-xs font-black
                        ${filled ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-100 text-blue-200'}`}
                    >
                      {filled ? '✓' : stampNum}
                    </div>
                  )
                })}
              </div>

              {foundUser.loyaltyStamps >= 10 && !foundUser.tenthStampReward && (
                <p className="font-sans text-xs text-neutral-400 italic">
                  10th stamp unlocked! (No reward code assigned yet)
                </p>
              )}
              {foundUser.loyaltyStamps >= 10 && foundUser.tenthStampReward && (
                <div className="bg-green-50 border border-green-200 px-3 py-2">
                  <p className="font-sans text-xs text-green-700 font-bold mb-1">
                    ✓ 10th stamp reward unlocked: <strong>{foundUser.tenthStampReward.code}</strong>
                  </p>
                  <p className="font-sans text-xs text-green-600">
                    {foundUser.tenthStampReward.discountType === 'percent' 
                      ? `${foundUser.tenthStampReward.discountValue}% off`
                      : `₱${foundUser.tenthStampReward.discountValue} off`
                    } — {foundUser.tenthStampReward.description}
                  </p>
                </div>
              )}
              {foundUser.loyaltyStamps >= 5 && foundUser.loyaltyStamps < 10 && !foundUser.fifthStampRedeemedAt && !foundUser.fifthStampReward && (
                <p className="font-sans text-xs text-neutral-400 italic">
                  5th stamp unlocked! (No reward code assigned yet)
                </p>
              )}
              {foundUser.loyaltyStamps >= 5 && foundUser.loyaltyStamps < 10 && foundUser.fifthStampReward && !foundUser.fifthStampRedeemedAt && (
                <div className="bg-blue-50 border border-blue-200 px-3 py-2">
                  <p className="font-sans text-xs text-blue-700 font-bold mb-1">
                    ✓ 5th stamp reward unlocked: <strong>{foundUser.fifthStampReward.code}</strong>
                  </p>
                  <p className="font-sans text-xs text-blue-600">
                    {foundUser.fifthStampReward.discountType === 'percent' 
                      ? `${foundUser.fifthStampReward.discountValue}% off`
                      : `₱${foundUser.fifthStampReward.discountValue} off`
                    } — {foundUser.fifthStampReward.description}
                  </p>
                </div>
              )}
              {foundUser.loyaltyStamps >= 5 && foundUser.loyaltyStamps < 10 && foundUser.fifthStampRedeemedAt && (
                <p className="font-sans text-xs text-neutral-400 italic">
                  5th stamp reward already claimed this cycle. {10 - foundUser.loyaltyStamps} more until 10th stamp reward.
                </p>
              )}
              {foundUser.loyaltyStamps < 5 && (
                <p className="font-sans text-xs text-neutral-500">
                  {5 - foundUser.loyaltyStamps} more completed order{5 - foundUser.loyaltyStamps === 1 ? '' : 's'} until 5th stamp reward.
                </p>
              )}
            </div>
          </>
        )}

        {/* ─── BASKETS ─────────────────────────────────────────── */}
        <SectionLabel>Baskets</SectionLabel>
        <Divider />
        <div className="space-y-4 mb-6">
          {baskets.map((basket, idx) => {
            const hasServiceError = basket.actualKg && !basket.serviceId
            const hasWeightError = basket.serviceId && !basket.actualKg
            const weightValue = basket.actualKg ? Number(basket.actualKg) : 0
            
            return (
              <div key={idx} className={`border ${hasServiceError || hasWeightError ? 'border-red-300 bg-red-50/30' : 'border-blue-100'} px-5 py-4 flex flex-col sm:flex-row gap-4 sm:items-end`}>
                <div className="flex-1">
                  <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">Service</label>
                  <select 
                    value={basket.serviceId} 
                    onChange={e => updateBasket(idx, 'serviceId', e.target.value)} 
                    className={hasServiceError ? selectErrorClass : selectClass}
                  >
                    <option value="">Select service...</option>
                    {walkInServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {fmt(s.price)}</option>
                    ))}
                  </select>
                  {hasServiceError && (
                    <p className="font-sans text-xs text-red-500 mt-1">Please select a service</p>
                  )}
                </div>
                <div className="w-full sm:w-32">
                  <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">Weight (kg)</label>
                  <input 
                    type="number" 
                    min="0.1" 
                    step="0.1" 
                    value={basket.actualKg}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '' || Number(val) >= 0) {
                        updateBasket(idx, 'actualKg', val)
                      }
                    }}
                    placeholder="e.g. 7" 
                    className={hasWeightError ? inputErrorClass : inputClass} 
                  />
                  {hasWeightError && (
                    <p className="font-sans text-xs text-red-500 mt-1">Please enter weight</p>
                  )}
                  {weightValue > 0 && weightValue < 0.5 && (
                    <p className="font-sans text-xs text-amber-500 mt-1">Minimum weight is 0.5kg</p>
                  )}
                </div>
                {baskets.length > 1 && (
                  <button onClick={() => removeBasket(idx)}
                    className="font-sans text-xs text-red-400 hover:text-red-600 uppercase tracking-widest font-bold pb-2.5 flex-shrink-0">
                    Remove
                  </button>
                )}
                {Number(basket.actualKg) > 7 && (
                  <p className="font-sans text-xs text-amber-600 sm:hidden">Over 7kg — resolution required below</p>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={addBasket}
          className="font-sans text-xs uppercase tracking-[0.2em] text-blue-500 hover:text-blue-700 transition-colors mb-10">
          + Add Another Basket
        </button>

        {/* ─── ADD-ONS ─────────────────────────────────────────── */}
        {branchId && (
          <>
            <SectionLabel>Add-ons (Optional)</SectionLabel>
            <Divider />
            <div className="space-y-6 mb-10">
              {productsList.length === 0 ? (
                <p className="font-sans text-sm text-neutral-400">No add-on products available at this branch.</p>
              ) : (
                Object.entries(productsByCategory).map(([cat, products]) => (
                  <div key={cat}>
                    <p className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-2">
                      {CATEGORY_LABELS[cat] || cat}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {products.map(product => {
                        const qty = addOnQty[product.id] || 0
                        const isAdded = qty > 0
                        return (
                          <div key={product.id}
                            className={`flex items-center gap-4 p-4 border transition-colors duration-200 ${isAdded ? 'bg-blue-50 border-blue-400' : 'bg-white border-blue-100 hover:bg-blue-50/40'}`}>
                            {product.image
                              ? <img src={product.image} alt={product.name} className="w-12 h-12 object-cover flex-shrink-0" />
                              : <div className="w-12 h-12 bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-400 font-bold font-sans">{product.name[0]?.toUpperCase()}</span>
                                </div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="font-sans text-sm font-semibold text-neutral-700 truncate">{product.name}</p>
                              <p className="font-sans text-xs text-blue-600 font-bold">{fmt(product.price)}</p>
                              {product.description && <p className="font-sans text-xs text-neutral-400 truncate">{product.description}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button onClick={() => decrementQty(product.id)} disabled={qty === 0}
                                className={`w-7 h-7 font-sans font-bold text-sm flex items-center justify-center border transition-colors ${
                                  qty > 0 ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white' : 'border-blue-100 text-blue-200 cursor-not-allowed'
                                }`}>−</button>
                              <input type="number" value={qty} onChange={e => setQty(product.id, e.target.value)}
                                className="w-8 text-center font-sans text-sm font-semibold border border-blue-100 focus:outline-none focus:border-blue-400 py-0.5"
                                min="0" max="99" />
                              <button onClick={() => incrementQty(product.id)}
                                className="w-7 h-7 font-sans font-bold text-sm flex items-center justify-center border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">+</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}

              {selectedAddOns.length > 0 && (
                <div className="border border-blue-100 bg-blue-50/40 px-6 py-5">
                  <p className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-2">Selected Add-ons</p>
                  <div className="font-sans text-sm space-y-1.5">
                    {selectedAddOns.map(a => (
                      <div key={a.productId} className="flex justify-between text-neutral-600">
                        <span>{a.name} × {a.quantity}</span>
                        <span className="font-medium">{fmt(a.price * a.quantity)}</span>
                      </div>
                    ))}
                    <div className="h-px bg-blue-200 my-1" />
                    <div className="flex justify-between text-blue-700 font-bold">
                      <span>Add-ons Total</span><span>{fmt(addOnsTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {anyOverweight && (
          <div className="mb-10 bg-amber-50 border border-amber-200 px-5 py-4">
            <p className="font-sans text-xs text-amber-700 mb-3">
              One or more baskets exceed 7kg. Choose how to handle the excess weight:
            </p>
            <div className="flex gap-3">
              <button onClick={handleSplitLoad}
                className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${overweightResolution === 'split' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-600 border-amber-300'}`}>
                Split into 2nd load
              </button>
              <button onClick={() => setOverweightResolution('trim')}
                className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${overweightResolution === 'trim' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-600 border-amber-300'}`}>
                Trim to 7kg (set excess aside)
              </button>
            </div>
            {!overweightResolution && (
              <p className="font-sans text-xs text-amber-600 mt-2">Please select an option to continue</p>
            )}
          </div>
        )}

        {/* ─── FULFILLMENT METHOD ──────────────────────────────── */}
        <SectionLabel>How will the client get this back?</SectionLabel>
        <Divider />
        <div className="flex gap-3 mb-10">
          <button onClick={() => setFulfillmentMethod('SELF_PICKUP')}
            className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${fulfillmentMethod === 'SELF_PICKUP' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>
            Client will come back
          </button>
          <button onClick={() => setFulfillmentMethod('DELIVERY')}
            className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${fulfillmentMethod === 'DELIVERY' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>
            Deliver to client
          </button>
        </div>

        {/* ─── DELIVERY ADDRESS (if DELIVERY selected) ──────────── */}
        {fulfillmentMethod === 'DELIVERY' && (
          <div className="mb-10">
            <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">
              Delivery Address {foundUser?.address && <span className="text-neutral-300 normal-case">(from record)</span>}
            </label>
            <input 
              type="text" 
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="e.g. 123 Main St, City." 
              className={inputClass}
            />
            {deliveryAddress && (
              <p className="font-sans text-xs text-green-600 mt-1.5"></p>
            )}
          </div>
        )}

        {/* ─── PAYMENT METHOD ──────────────────────────────────── */}
        <SectionLabel>How will the client pay?</SectionLabel>
        <Divider />
        <div className="flex gap-3 mb-10">
          <button onClick={() => setPaymentMethod('CASH')}
            className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${paymentMethod === 'CASH' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>
            Cash
          </button>
          <button onClick={() => setPaymentMethod('ONLINE')}
            className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${paymentMethod === 'ONLINE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>
            Online Payment (QR)
          </button>
        </div>

        {/* ─── SUMMARY ─────────────────────────────────────────── */}
        <SectionLabel>Estimated Total</SectionLabel>
        <Divider />
        <div className="bg-blue-50 border border-blue-100 px-5 py-4 mb-10">
          <div className="flex items-center justify-between mb-1">
            <span className="font-sans text-xs uppercase tracking-widest text-neutral-500">Subtotal (before VAT)</span>
            <span className={`font-sans font-black text-blue-700 text-xl ${autoPromo ? 'line-through text-neutral-300 text-base' : ''}`} style={{ letterSpacing: '-0.02em' }}>
              {fmt(estimatedTotal)}
            </span>
          </div>

          {autoPromo && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100">
              <span className="font-sans text-xs uppercase tracking-widest text-green-700 font-bold">
                ✓ Promo {autoPromo.tier} stamp — {autoPromo.code}
              </span>
              <span className="font-sans text-sm font-bold text-green-700">
                − {fmt(discountAmount)}
              </span>
            </div>
          )}

          {autoPromo && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-200">
              <span className="font-sans text-xs uppercase tracking-widest text-blue-700 font-bold">Final Estimated Total</span>
              <span className="font-sans font-black text-blue-700 text-xl" style={{ letterSpacing: '-0.02em' }}>
                {fmt(finalEstimate)}
              </span>
            </div>
          )}
        </div>

        {/* ─── SUBMIT BUTTON ───────────────────────────────────── */}
        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-2 w-full py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
          <span className="relative">{submitting ? 'Creating...' : '✓ Create Walk-In Appointment'}</span>
        </button>

      </div>

      {/* ─── QR PAYMENT MODAL ───────────────────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-8 relative"
               style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            
            {!paymentConfirmed && (
              <button onClick={closeQrModal}
                className="absolute top-3 right-3 text-neutral-300 hover:text-neutral-500 text-2xl leading-none">
                ×
              </button>
            )}

            <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2">
              Online Payment
            </p>
            <h2 className="text-neutral-800 mb-1" style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1.5rem' }}>
              Scan to Pay
            </h2>
            <p className="font-sans text-xs text-neutral-500 mb-6">
              Ask the client to scan this QR code using GCash, Maya, or any supported e-wallet.
            </p>

            <div className="flex items-center justify-center mb-6 min-h-[220px]">
              {qrError ? (
                <div className="text-center">
                  <p className="font-sans text-sm text-red-500 mb-2">{qrError}</p>
                  <button
                    onClick={() => openQrFlow(createdAppointmentId)}
                    className="font-sans text-xs uppercase tracking-widest text-blue-600 hover:text-blue-800 font-bold">
                    Retry
                  </button>
                </div>
              ) : qrImageUrl ? (
                <img src={qrImageUrl} alt="Payment QR Code" className="w-56 h-56 object-contain" />
              ) : (
                <p className="font-sans text-sm text-neutral-400">Generating QR code...</p>
              )}
            </div>

            {paymentConfirmed ? (
              <div className="bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
                <span className="text-green-600 text-lg">✓</span>
                <p className="font-sans text-sm text-green-700">Payment confirmed! Closing...</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 px-4 py-3 flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="font-sans text-xs text-blue-600">
                  Waiting for payment confirmation...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminWalkIn