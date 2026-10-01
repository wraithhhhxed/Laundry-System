import { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { X } from 'lucide-react'

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'flat',
  discountValue: '',
  minOrderAmount: '',
  maxUses: '',
  expiresAt: '',
  assignedMilestone: null,
}

const EMPTY_WHEEL_FORM = {
  availableServices: [],
  discountAmount: 50,
  bagPrizeName: 'Selfie Wash Laundry Bag',
}

const FieldError = ({ message }) =>
  message
    ? <p className='font-sans text-[11px] text-red-500 mt-1'>
        {message}
      </p>
    : null

// ─── Sanitizers ──────────────────────────────────────────────────
const sanitizeCode = (v) =>
  String(v || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .toUpperCase()
    .replace(/^[_-]+/, '')
    .replace(/[_-]+$/, '')

const sanitizeDescription = (v) =>
  String(v || '')
    .replace(/[^A-Za-z0-9\s.,!?₱%()-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9\s]+/, '')
    .slice(0, 200)

const sanitizeBagPrize = (v) =>
  String(v || '')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '')
    .trim()

const sanitizeNumber = (v, allowDecimal = true) => {
  let s = String(v ?? '').replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '')
  if (allowDecimal) {
    const firstDot = s.indexOf('.')
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
    }
    const parts = s.split('.')
    if (parts[1] && parts[1].length > 2) {
      s = parts[0] + '.' + parts[1].slice(0, 2)
    }
  }
  return s
}

const PromoCodesList = () => {
  const {
    promoCodes, getAllPromoCodes,
    addPromoCode, updatePromoCode, deletePromoCode, togglePromoCode,
    services, getAllServices,
  } = useContext(AdminContext)

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [search, setSearch]     = useState('')
  const [errors, setErrors]     = useState({})

  const [wheelTab, setWheelTab] = useState(false)
  const [wheelForm, setWheelForm] = useState(EMPTY_WHEEL_FORM)
  const [wheelErrors, setWheelErrors] = useState({})
  const [wheelSetup, setWheelSetup] = useState(null)

  useEffect(() => {
    getAllPromoCodes()
    getAllServices()
    fetchWheelSetup()
  }, [])

  const fetchWheelSetup = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch('/api/admin/lucky-wheel/setup', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        const setup = data.setup || data.data?.setup
        if (setup) {
          const sanitized = {
            ...setup,
            bagPrizeName: sanitizeBagPrize(setup.bagPrizeName),
          }
          setWheelSetup(sanitized)
          setWheelForm(sanitized)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch lucky wheel setup:', err.message)
    }
  }

  // ─── Generic setter (for select/date fields only) ───────────────
  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  // ─── Code ──
  const handleCodeChange = (e) => {
    const cleaned = sanitizeCode(e.target.value)
    setForm(prev => ({ ...prev, code: cleaned }))
    if (errors.code) setErrors(prev => { const e = { ...prev }; delete e.code; return e })
  }
  const handleCodeKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[A-Za-z0-9_-]/.test(e.key)) { e.preventDefault(); return }
    if (!form.code && (e.key === '-' || e.key === '_')) e.preventDefault()
  }
  const handleCodeBeforeInput = (e) => {
    const data = e.data || ''
    if (data && !/^[A-Za-z0-9_-]*$/.test(data)) { e.preventDefault(); return }
    if (data && !form.code && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
  }
  const handleCodePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeCode(pasted)
    setForm(prev => ({ ...prev, code: sanitizeCode(prev.code + clean) }))
    if (errors.code) setErrors(prev => { const e = { ...prev }; delete e.code; return e })
  }

  // ─── Description ──
  const handleDescriptionChange = (e) => {
    const cleaned = sanitizeDescription(e.target.value)
    setForm(prev => ({ ...prev, description: cleaned }))
    if (errors.description) setErrors(prev => { const e = { ...prev }; delete e.description; return e })
  }
  const handleDescriptionKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key === ' ') return
    if (e.key.length === 1 && !/[A-Za-z0-9.,!?₱%()-]/.test(e.key)) e.preventDefault()
    if (!form.description && e.key.length === 1 && !/[A-Za-z0-9\s]/.test(e.key)) e.preventDefault()
  }
  const handleDescriptionBeforeInput = (e) => {
    const data = e.data || ''
    if (data && !/^[A-Za-z0-9\s.,!?₱%()-]*$/.test(data)) { e.preventDefault(); return }
    if (data && !form.description && !/^[A-Za-z0-9\s]/.test(data)) e.preventDefault()
  }
  const handleDescriptionPaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeDescription(pasted)
    setForm(prev => ({ ...prev, description: sanitizeDescription(prev.description + ' ' + clean) }))
    if (errors.description) setErrors(prev => { const e = { ...prev }; delete e.description; return e })
  }

  // ─── Number fields ──
  const handleNumberChange = (field, allowDecimal = true) => (e) => {
    const cleaned = sanitizeNumber(e.target.value, allowDecimal)
    setForm(prev => ({ ...prev, [field]: cleaned }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }
  const handleNumberKeyDown = (allowDecimal, currentValue) => (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (allowDecimal) {
      if (e.key.length === 1 && !/[0-9.]/.test(e.key)) { e.preventDefault(); return }
      if (e.key === '.' && String(currentValue || '').includes('.')) e.preventDefault()
    } else {
      if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault()
    }
  }
  const handleNumberPaste = (field, allowDecimal) => (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeNumber(pasted, allowDecimal)
    setForm(prev => ({ ...prev, [field]: clean }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  // ─── Search ──
  const handleSearchChange = (e) => {
    const cleaned = String(e.target.value || '').replace(/[^A-Za-z0-9\s_-]/g, '')
    setSearch(cleaned)
  }
  const handleSearchKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[A-Za-z0-9\s_-]/.test(e.key)) e.preventDefault()
  }
  const handleSearchPaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    setSearch(pasted.replace(/[^A-Za-z0-9\s_-]/g, ''))
  }

  // ─── Wheel: Bag prize ──
  const handleBagPrizeChange = (e) => {
    const cleaned = sanitizeBagPrize(e.target.value)
    setWheelForm(prev => ({ ...prev, bagPrizeName: cleaned }))
    if (wheelErrors.bagPrizeName) setWheelErrors(prev => { const e = { ...prev }; delete e.bagPrizeName; return e })
  }
  const handleBagPrizeKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[A-Za-z0-9\s]/.test(e.key)) e.preventDefault()
    if (!wheelForm.bagPrizeName && e.key === ' ') e.preventDefault()
  }
  const handleBagPrizeBeforeInput = (e) => {
    const data = e.data || ''
    if (data && !/^[A-Za-z0-9\s]*$/.test(data)) { e.preventDefault(); return }
    if (data && !wheelForm.bagPrizeName && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
  }
  const handleBagPrizePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeBagPrize(pasted)
    setWheelForm(prev => ({ ...prev, bagPrizeName: sanitizeBagPrize(prev.bagPrizeName + ' ' + clean) }))
    if (wheelErrors.bagPrizeName) setWheelErrors(prev => { const e = { ...prev }; delete e.bagPrizeName; return e })
  }

  // ─── Wheel: Discount ──
  const handleWheelDiscountChange = (e) => {
    const cleaned = sanitizeNumber(e.target.value, true)
    setWheelForm(prev => ({ ...prev, discountAmount: cleaned === '' ? '' : Number(cleaned) }))
    if (wheelErrors.discountAmount) setWheelErrors(prev => { const e = { ...prev }; delete e.discountAmount; return e })
  }
  const handleWheelDiscountKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[0-9.]/.test(e.key)) { e.preventDefault(); return }
    if (e.key === '.' && String(wheelForm.discountAmount).includes('.')) e.preventDefault()
  }
  const handleWheelDiscountPaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeNumber(pasted, true)
    setWheelForm(prev => ({ ...prev, discountAmount: clean === '' ? '' : Number(clean) }))
    if (wheelErrors.discountAmount) setWheelErrors(prev => { const e = { ...prev }; delete e.discountAmount; return e })
  }

  // ─── Validation ──
  const validate = () => {
    const errs = {}
    const today = new Date().toISOString().split('T')[0]

    if (!form.code.trim())
      errs.code = 'Promo is required.'
    else if (!/^[A-Z0-9_-]+$/i.test(form.code.trim()))
      errs.code = 'Only letters, numbers, hyphens, and underscores are allowed.'
    else if (form.code.trim().length < 3)
      errs.code = 'Promo must be at least 3 characters.'
    else if (form.code.trim().length > 30)
      errs.code = 'Promo must not exceed 30 characters.'

    if (form.discountValue === '' || form.discountValue === null)
      errs.discountValue = 'Discount value is required.'
    else if (isNaN(Number(form.discountValue)))
      errs.discountValue = 'Must be a valid number.'
    else if (Number(form.discountValue) <= 0)
      errs.discountValue = 'Discount value must be greater than 0.'
    else if (form.discountType === 'percent' && Number(form.discountValue) > 100)
      errs.discountValue = 'Percent discount cannot exceed 100%.'
    else if (form.discountType === 'flat' && Number(form.discountValue) > 999999)
      errs.discountValue = 'Flat discount seems too high. Please double-check.'

    if (form.minOrderAmount !== '') {
      if (isNaN(Number(form.minOrderAmount)))
        errs.minOrderAmount = 'Must be a valid number.'
      else if (Number(form.minOrderAmount) < 0)
        errs.minOrderAmount = 'Cannot be negative.'
    }

    if (form.maxUses !== '') {
      if (!Number.isInteger(Number(form.maxUses)) || Number(form.maxUses) < 1)
        errs.maxUses = 'Must be a whole number of at least 1.'
    }

    if (form.expiresAt && form.expiresAt < today)
      errs.expiresAt = 'Expiry date must be today or in the future.'

    if (form.description.trim().length > 200)
      errs.description = 'Description must not exceed 200 characters.'

    return errs
  }

  const openAdd = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      code:           sanitizeCode(item.code),
      description:    sanitizeDescription(item.description || ''),
      discountType:   item.discountType,
      discountValue:  sanitizeNumber(item.discountValue, true),
      minOrderAmount: item.minOrderAmount ? sanitizeNumber(item.minOrderAmount, true) : '',
      maxUses:        item.maxUses ?? '',
      expiresAt:      item.expiresAt ? item.expiresAt.split('T')[0] : '',
      assignedMilestone: item.assignedMilestone || null,
    })
    setErrors({})
    setShowForm(true)
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const payload = {
      code:           form.code.trim().toUpperCase(),
      description:    form.description.trim(),
      discountType:   form.discountType,
      discountValue:  Number(form.discountValue),
      minOrderAmount: form.minOrderAmount !== '' ? Number(form.minOrderAmount) : 0,
      maxUses:        form.maxUses !== '' ? Number(form.maxUses) : null,
      expiresAt:      form.expiresAt || null,
      assignedMilestone: form.assignedMilestone || null,
    }
    if (editItem) await updatePromoCode(editItem.id, payload)
    else await addPromoCode(payload)
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this promo?')) await deletePromoCode(id)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const isExpired = (item) => item.expiresAt && new Date() > new Date(item.expiresAt)
  const isMaxed   = (item) => item.maxUses !== null && item.usedCount >= item.maxUses

  const getStatusBadge = (item) => {
    if (!item.isActive)  return <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-neutral-200 text-neutral-400 px-2 py-1'>Inactive</span>
    if (isExpired(item)) return <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-red-200 text-red-500 px-2 py-1'>Expired</span>
    if (isMaxed(item))   return <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-orange-200 text-orange-500 px-2 py-1'>Maxed Out</span>
    return <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-green-200 text-green-600 px-2 py-1'>Active</span>
  }

  const filtered = promoCodes.filter(p => {
    const q = search.toLowerCase()
    return (
      p.code.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    )
  })

  const inputCls = (field) =>
    `w-full px-4 py-2.5 border font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none transition-colors bg-white ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-blue-100 focus:border-blue-400'
    }`

  const saveWheelSetup = async () => {
    const errs = {}
    if (!wheelForm.availableServices || wheelForm.availableServices.length === 0)
      errs.availableServices = 'Select one service'
    if (!wheelForm.discountAmount || Number(wheelForm.discountAmount) <= 0)
      errs.discountAmount = 'Discount must be > 0'
    if (!wheelForm.bagPrizeName.trim())
      errs.bagPrizeName = 'Bag prize name is required'
    else if (wheelForm.bagPrizeName.trim().length < 2)
      errs.bagPrizeName = 'Bag prize name must be at least 2 characters'

    if (Object.keys(errs).length > 0) { setWheelErrors(errs); return }

    try {
      const token = localStorage.getItem('adminToken')
      const sanitizedPayload = {
        ...wheelForm,
        bagPrizeName: sanitizeBagPrize(wheelForm.bagPrizeName),
      }
      const res = await fetch('/api/admin/lucky-wheel/setup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanitizedPayload)
      })
      if (res.ok) {
        const data = await res.json()
        const setup = data.setup || data.data?.setup
        if (setup) {
          const sanitized = { ...setup, bagPrizeName: sanitizeBagPrize(setup.bagPrizeName) }
          setWheelSetup(sanitized)
          setWheelForm(sanitized)
        }
        setWheelTab(false)
        alert('Lucky Wheel setup saved!')
      }
    } catch (err) {
      console.error('Failed to save lucky wheel setup:', err)
    }
  }

  // ─── Grid template — pareho para sa header at data ──────────────
  const GRID = 'grid grid-cols-[0.3fr_1.6fr_1fr_0.8fr_0.9fr_1fr_0.9fr_0.8fr_1.9fr]'

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      <div
        className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>
          Catalog
        </p>
        <div className='flex items-center justify-between'>
          <div>
            <h1
              className='font-sans font-black text-white'
              style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
            >
              {wheelTab ? 'Lucky Wheel Setup' : 'Promos'}
            </h1>
            {wheelTab && (
              <p className='text-blue-200 text-xs font-sans mt-1'>Configure lucky wheel prizes & available service</p>
            )}
          </div>
          <div className='flex gap-2'>
            {wheelTab && (
              <button
                onClick={() => setWheelTab(false)}
                className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <span className='relative z-10'>Back</span>
              </button>
            )}
            {!wheelTab && (
              <>
                <button
                  onClick={() => { setWheelTab(true); setWheelErrors({}) }}
                  className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <span className='relative z-10'>Wheel Setup</span>
                </button>
                <button
                  onClick={openAdd}
                  className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <span className='relative z-10'>+ Add Promo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {wheelTab && (
        <div className='px-7 pb-10'>
          <div className='bg-white border border-blue-100 overflow-hidden'>
            <div className='p-7 space-y-6'>
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700 block mb-3'>
                  Available Service for Free Prize
                  <span className='text-red-400 normal-case text-[10px]'> (select one)</span>
                </label>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {services.length === 0 ? (
                    <p className='text-neutral-400 text-xs'>No services found. Create services first.</p>
                  ) : (
                    services.map(svc => (
                      <label key={svc.id} className='flex items-center gap-2 cursor-pointer'>
                        <input
                          type='radio'
                          name='wheelService'
                          checked={wheelForm.availableServices[0] === svc.name}
                          onChange={() => setWheelForm(prev => ({ ...prev, availableServices: [svc.name] }))}
                          className='w-4 h-4 border-blue-300'
                        />
                        <span className='font-sans text-sm text-neutral-700'>{svc.name}</span>
                        <span className='text-neutral-400 text-xs'>(₱{svc.price})</span>
                      </label>
                    ))
                  )}
                </div>
                {wheelErrors.availableServices && (
                  <p className='text-red-500 text-xs mt-2'>{wheelErrors.availableServices}</p>
                )}
              </div>

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700 block mb-1.5'>
                  Free Discount Prize (₱)
                </label>
                <input
                  type='text'
                  inputMode='decimal'
                  value={wheelForm.discountAmount}
                  onChange={handleWheelDiscountChange}
                  onKeyDown={handleWheelDiscountKeyDown}
                  onPaste={handleWheelDiscountPaste}
                  onDrop={e => e.preventDefault()}
                  autoComplete='off'
                  className='w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 bg-white'
                />
                {wheelErrors.discountAmount && (
                  <p className='text-red-500 text-xs mt-1'>{wheelErrors.discountAmount}</p>
                )}
                <p className='text-neutral-400 text-xs mt-1'>When user wins FREE_DISCOUNT prize, they get -₱{wheelForm.discountAmount} off</p>
              </div>

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700 block mb-1.5'>
                  Free Bag Prize Name
                </label>
                <input
                  type='text'
                  value={wheelForm.bagPrizeName}
                  onBeforeInput={handleBagPrizeBeforeInput}
                  onKeyDown={handleBagPrizeKeyDown}
                  onChange={handleBagPrizeChange}
                  onPaste={handleBagPrizePaste}
                  onDrop={e => e.preventDefault()}
                  autoComplete='off'
                  className='w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 bg-white'
                />
                {wheelErrors.bagPrizeName && (
                  <p className='text-red-500 text-xs mt-1'>{wheelErrors.bagPrizeName}</p>
                )}
              </div>

              <div className='bg-blue-50 border border-blue-200 p-4 rounded'>
                <p className='font-sans text-xs font-semibold text-neutral-700 mb-2'>Lucky Wheel Summary</p>
                <ul className='text-xs font-sans text-neutral-600 space-y-1'>
                  <li>- 6 wheel slices: 2x Free Service, 2x Free Discount, 2x Free Bag</li>
                  <li>- Free Service: {wheelForm.availableServices.length > 0
                    ? `gives ${wheelForm.availableServices[0]}`
                    : 'no service selected'}
                  </li>
                  <li>- Free Discount: -₱{wheelForm.discountAmount}</li>
                  <li>- Free Bag: {wheelForm.bagPrizeName}</li>
                </ul>
              </div>

              <div className='flex gap-3'>
                <button
                  onClick={() => setWheelTab(false)}
                  className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                  <span className='relative z-10'>Cancel</span>
                </button>
                <button
                  onClick={saveWheelSetup}
                  className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                  <span className='relative z-10'>Save Setup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!wheelTab && (
      <div className='px-7 pb-10'>

        <div className='bg-white border border-blue-100 px-5 py-4 mb-4'>
          <div className='relative'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 pointer-events-none'
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0'/>
            </svg>
            <input
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onPaste={handleSearchPaste}
              onDrop={e => e.preventDefault()}
              placeholder='Search by Promo name or description...'
              autoComplete='off'
              className='w-full pl-9 pr-8 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
            />
            {search && (
              <button onClick={() => setSearch('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className='mb-4'>
          <p className='font-sans text-xs text-neutral-400'>
            Showing{' '}
            <span className='font-sans font-black text-neutral-700'>{filtered.length}</span>
            {' '}of {promoCodes.length} promo{promoCodes.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className='bg-white border border-neutral-200 overflow-hidden'>

          {/* Header — parehong grid at naka-center lahat */}
          <div className={`${GRID} bg-blue-50 border-b border-neutral-200`}>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>No.</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Promo</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>Discount</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>Min Order</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>Uses</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>Expires</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>Milestone</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 border-r border-neutral-200 text-center'>Status</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-2 py-3 text-center'>Actions</span>
          </div>

          {filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {promoCodes.length === 0 ? 'No promo yet.' : 'No promo match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-neutral-200'>
              {filtered.map((item, index) => (
                <div key={item.id} className={`${GRID} items-center hover:bg-blue-50 transition-colors`}>

                  {/* Number */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans font-bold text-sm text-neutral-500'>{index + 1}</span>
                  </div>

                  {/* Promo */}
                  <div className='px-4 py-4 border-r border-neutral-200 text-center'>
                    <p className='font-sans font-black text-sm text-neutral-700 tracking-wider'>{item.code}</p>
                    {item.description && (
                      <p className='font-sans text-xs text-neutral-400 mt-0.5'>{item.description}</p>
                    )}
                  </div>

                  {/* Discount */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans font-black text-sm text-blue-600'>
                      {item.discountType === 'flat' ? `₱${item.discountValue} off` : `${item.discountValue}% off`}
                    </span>
                  </div>

                  {/* Min Order */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans text-sm text-neutral-500'>
                      {item.minOrderAmount > 0 ? `₱${item.minOrderAmount}` : '—'}
                    </span>
                  </div>

                  {/* Uses */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans font-black text-sm text-neutral-700'>
                      {item.usedCount}
                      <span className='font-sans font-normal text-neutral-400'>
                        {item.maxUses !== null ? ` / ${item.maxUses}` : ' / ∞'}
                      </span>
                    </span>
                  </div>

                  {/* Expires */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans text-xs text-neutral-500'>{formatDate(item.expiresAt)}</span>
                  </div>

                  {/* Milestone */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    {item.assignedMilestone ? (
                      <span className='bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap'>
                        {item.assignedMilestone === 'FIFTH' && '5th Stamp'}
                        {item.assignedMilestone === 'TENTH' && '10th Stamp'}
                        {item.assignedMilestone === 'FIFTEENTH' && '15th Stamp'}
                        {item.assignedMilestone === 'LUCKY_WHEEL' && 'Lucky Wheel'}
                      </span>
                    ) : (
                      <span className='text-neutral-400 text-xs'>—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className='px-2 py-4 border-r border-neutral-200 flex justify-center'>
                    {getStatusBadge(item)}
                  </div>

                  {/* Actions */}
                  <div className='px-3 py-4 flex items-center justify-center gap-3'>
                    <button onClick={() => togglePromoCode(item.id)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 hover:text-blue-600 transition-colors whitespace-nowrap'>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-blue-500 hover:text-blue-700 transition-colors whitespace-nowrap'>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-400 hover:text-red-600 transition-colors whitespace-nowrap'>
                      Delete
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div
            className='bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            <div
              className='px-6 py-5 sticky top-0 z-10'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>
                    Catalog
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {editItem ? 'Edit Promo' : 'Add New Promo'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-blue-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>

              {Object.keys(errors).length > 1 && (
                <div className='border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2'>
                  <span className='text-red-400 text-sm mt-0.5 flex-shrink-0'>!</span>
                  <p className='font-sans text-xs text-red-600'>
                    Please fix <span className='font-bold'>{Object.keys(errors).length} errors</span> before saving.
                  </p>
                </div>
              )}

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Promo <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    value={form.code}
                    onBeforeInput={handleCodeBeforeInput}
                    onKeyDown={handleCodeKeyDown}
                    onChange={handleCodeChange}
                    onPaste={handleCodePaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. SAVE50'
                    autoComplete='off'
                    className={`${inputCls('promo')} uppercase`}
                  />
                  <FieldError message={errors.code} />
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Description
                    <span className='normal-case font-normal text-neutral-300 ml-2'>
                      ({form.description.length}/200)
                    </span>
                  </label>
                  <input
                    value={form.description}
                    onBeforeInput={handleDescriptionBeforeInput}
                    onKeyDown={handleDescriptionKeyDown}
                    onChange={handleDescriptionChange}
                    onPaste={handleDescriptionPaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. ₱50 off on all orders'
                    maxLength={200}
                    autoComplete='off'
                    className={inputCls('description')}
                  />
                  <FieldError message={errors.description} />
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Discount Type <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <select
                    value={form.discountType}
                    onChange={set('discountType')}
                    className={inputCls('discountType')}
                  >
                    <option value='flat'>Flat (₱ off)</option>
                    <option value='percent'>Percent (% off)</option>
                  </select>
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Discount Value <span className='text-red-400 normal-case'>*</span>
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>
                      {form.discountType === 'flat' ? '(₱ amount)' : '(% e.g. 10)'}
                    </span>
                  </label>
                  <input
                    type='text'
                    inputMode='decimal'
                    value={form.discountValue}
                    onChange={handleNumberChange('discountValue', true)}
                    onKeyDown={handleNumberKeyDown(true, form.discountValue)}
                    onPaste={handleNumberPaste('discountValue', true)}
                    onDrop={e => e.preventDefault()}
                    placeholder={form.discountType === 'flat' ? 'e.g. 50' : 'e.g. 10'}
                    autoComplete='off'
                    className={inputCls('discountValue')}
                  />
                  <FieldError message={errors.discountValue} />
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Min Order (₱)
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— optional</span>
                  </label>
                  <input
                    type='text'
                    inputMode='decimal'
                    value={form.minOrderAmount}
                    onChange={handleNumberChange('minOrderAmount', true)}
                    onKeyDown={handleNumberKeyDown(true, form.minOrderAmount)}
                    onPaste={handleNumberPaste('minOrderAmount', true)}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. 200'
                    autoComplete='off'
                    className={inputCls('minOrderAmount')}
                  />
                  <FieldError message={errors.minOrderAmount} />
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Max Uses
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— blank = unlimited</span>
                  </label>
                  <input
                    type='text'
                    inputMode='numeric'
                    value={form.maxUses}
                    onChange={handleNumberChange('maxUses', false)}
                    onKeyDown={handleNumberKeyDown(false, form.maxUses)}
                    onPaste={handleNumberPaste('maxUses', false)}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. 100'
                    autoComplete='off'
                    className={inputCls('maxUses')}
                  />
                  <FieldError message={errors.maxUses} />
                </div>

                <div className='sm:col-span-2'>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Expiry Date
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— blank = no expiry</span>
                  </label>
                  <input
                    type='date'
                    value={form.expiresAt}
                    onChange={set('expiresAt')}
                    onKeyDown={e => {
                      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
                      if (allowed.includes(e.key)) return
                      if (e.ctrlKey || e.metaKey) return
                      if (e.key.length === 1 && !/[0-9/-]/.test(e.key)) e.preventDefault()
                    }}
                    onPaste={e => e.preventDefault()}
                    onDrop={e => e.preventDefault()}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputCls('expiresAt')}
                  />
                  <FieldError message={errors.expiresAt} />
                </div>

                <div className='sm:col-span-2'>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Assigned Milestone
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— optional</span>
                  </label>
                  <select
                    value={form.assignedMilestone || ''}
                    onChange={set('assignedMilestone')}
                    className={inputCls('assignedMilestone')}
                  >
                    <option value=''>None (Regular Promo)</option>
                    <option value='FIFTH'>5th Stamp Reward</option>
                    <option value='TENTH'>10th Stamp Reward</option>
                    <option value='FIFTEENTH'>15th Stamp Reward</option>
                  </select>
                </div>

              </div>
            </div>

            <div className='px-6 pb-6 flex gap-3'>
              <button
                onClick={() => setShowForm(false)}
                className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button
                onClick={handleSubmit}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{editItem ? 'Save Changes' : 'Add Promo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromoCodesList