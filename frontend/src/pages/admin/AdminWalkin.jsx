import { useEffect, useContext, useState, useRef } from 'react'
import { AdminContext } from '../../context/AdminContext'

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2">{children}</p>
)
const Divider = () => <div className="h-px bg-blue-100 mb-6" />

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

// ─── VALIDATION HELPERS ──────────────────────────────────────────
const validatePhone = (phone) => {
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, '')
  // Philippine mobile numbers: 11 digits, starts with 09
  return digits.length >= 10 && digits.length <= 11 && digits.startsWith('09')
}

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const validateName = (name) => {
  // Only letters, spaces, dots, hyphens, and apostrophes allowed
  // Minimum 2 characters
  return /^[A-Za-z\s.\-']{2,}$/.test(name.trim())
}

const AdminWalkIn = () => {
  const {
    aToken,
    branches, getAllBranches,
    walkInServices, getWalkInServices,
    lookupPhone, createWalkInAppointment,
  } = useContext(AdminContext)

  useEffect(() => { if (aToken) { getAllBranches(); getWalkInServices() } }, [aToken])

  // ─── Branch selection (Super Admin only — Branch Portal knows its own branch via token) ──
  const [branchId, setBranchId] = useState('')

  // ─── Phone lookup ───────────────────────────────────────────────
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [guestName, setGuestName]   = useState('')
  const [nameError, setNameError]   = useState('')
  const [foundUser, setFoundUser]   = useState(null)
  const [lookupState, setLookupState] = useState('idle') // idle | loading | found | not_found
  const lookupTimer = useRef(null)

  // Validate phone on change
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

  // Validate name on change
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

  // Phone lookup with debounce
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

  const anyOverweight = baskets.some(b => Number(b.actualKg) > 7)

  // ─── Overweight resolution (only asked if any basket > 7kg) ─────
  const [overweightResolution, setOverweightResolution] = useState('')

  // ─── Fulfillment method (self pickup vs delivery) ───────────────
  const [fulfillmentMethod, setFulfillmentMethod] = useState('SELF_PICKUP')

  // ─── Payment method (cash vs online) at email ────────────────────
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  // Validate email on change
  useEffect(() => {
    if (paymentMethod === 'ONLINE' && email.trim().length > 0) {
      if (!validateEmail(email.trim())) {
        setEmailError('Please enter a valid email address')
      } else {
        setEmailError('')
      }
    } else {
      setEmailError('')
    }
  }, [email, paymentMethod])

  // ─── Submit ───────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const resetForm = () => {
    setBranchId('')
    setPhone(''); setPhoneError(''); setGuestName(''); setNameError(''); setFoundUser(null); setLookupState('idle')
    setBaskets([{ serviceId: '', actualKg: '' }])
    setOverweightResolution('')
    setFulfillmentMethod('SELF_PICKUP')
    setPaymentMethod('CASH')
    setEmail(''); setEmailError('')
  }

  // ─── Check if any basket has actualKg but no service ─────────────
  const hasIncompleteBasket = baskets.some(b => b.actualKg && !b.serviceId)

  // ─── Check if any basket has service but no weight ──────────────
  const hasServiceNoWeight = baskets.some(b => b.serviceId && !b.actualKg)

  // ─── Check if any basket weight is invalid ──────────────────────
  const hasInvalidWeight = baskets.some(b => b.actualKg && Number(b.actualKg) < 0)

  // ─── Can submit ──────────────────────────────────────────────────
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
    (!anyOverweight || overweightResolution) &&
    (paymentMethod !== 'ONLINE' || (email.trim().length > 0 && !emailError))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSuccessMsg('')

    const payload = {
      branchId,
      phone: phone.trim(),
      guestName: guestName.trim() || null,
      services: baskets.map(b => ({ serviceId: b.serviceId, actualKg: Number(b.actualKg) })),
      overweightResolution: anyOverweight ? overweightResolution : null,
      fulfillmentMethod,
      paymentMethod,
      email: paymentMethod === 'ONLINE' ? email.trim() : null,
    }

    const ok = await createWalkInAppointment(payload)
    setSubmitting(false)
    if (ok) {
      setSuccessMsg('Walk-in appointment created! Client will now appear under All Appointments.')
      resetForm()
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

        {/* ─── BRANCH SELECTION (Super Admin only) ───────────────── */}
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
                // Only allow digits and limit to 11 characters
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
                // Allow letters, spaces, dots, hyphens, apostrophes
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
                      // Only allow positive numbers
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

        {anyOverweight && (
          <div className="mb-10 bg-amber-50 border border-amber-200 px-5 py-4">
            <p className="font-sans text-xs text-amber-700 mb-3">
              One or more baskets exceed 7kg. Choose how to handle the excess weight:
            </p>
            <div className="flex gap-3">
              <button onClick={() => setOverweightResolution('split')}
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

        {/* ─── PAYMENT METHOD ──────────────────────────────────── */}
        <SectionLabel>How will the client pay?</SectionLabel>
        <Divider />
        <div className="flex gap-3 mb-5">
          <button onClick={() => setPaymentMethod('CASH')}
            className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${paymentMethod === 'CASH' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>
            Cash
          </button>
          <button onClick={() => setPaymentMethod('ONLINE')}
            className={`flex-1 py-2.5 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${paymentMethod === 'ONLINE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200'}`}>
            Online Payment
          </button>
        </div>

        {paymentMethod === 'ONLINE' && (
          <div className="mb-10">
            <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider mb-1.5 block">
              Client Email <span className="text-amber-500 normal-case">(required — payment link will be sent here)</span>
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. juan@gmail.com" 
              className={emailError ? inputErrorClass : inputClass} 
            />
            {emailError && <p className="font-sans text-xs text-red-500 mt-1.5">{emailError}</p>}
          </div>
        )}

        {paymentMethod === 'CASH' && <div className="mb-10" />}

        {/* ─── SUMMARY ─────────────────────────────────────────── */}
        <SectionLabel>Estimated Total</SectionLabel>
        <Divider />
        <div className="bg-blue-50 border border-blue-100 px-5 py-4 flex items-center justify-between mb-10">
          <span className="font-sans text-xs uppercase tracking-widest text-neutral-500">Total (before VAT)</span>
          <span className="font-sans font-black text-blue-700 text-xl" style={{ letterSpacing: '-0.02em' }}>{fmt(estimatedTotal)}</span>
        </div>

        {/* ─── SUBMIT BUTTON ───────────────────────────────────── */}
        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-2 w-full py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
          <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
          <span className="relative">{submitting ? 'Creating...' : '✓ Create Walk-In Appointment'}</span>
        </button>

        
      </div>
    </div>
  )
}

export default AdminWalkIn