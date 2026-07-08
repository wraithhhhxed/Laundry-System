// frontend/src/pages/admin/PromoCodesList.jsx
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
}

// ── Field error message ──────────────────────────────────────────────────────
const FieldError = ({ message }) =>
  message
    ? <p className='font-sans text-[11px] text-red-500 mt-1 flex items-center gap-1'>
        <span>⚠</span> {message}
      </p>
    : null

const PromoCodesList = () => {
  const {
    promoCodes, getAllPromoCodes,
    addPromoCode, updatePromoCode, deletePromoCode, togglePromoCode,
  } = useContext(AdminContext)

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [search, setSearch]     = useState('')
  const [errors, setErrors]     = useState({})

  useEffect(() => { getAllPromoCodes() }, [])

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error for that field on change
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    const today = new Date().toISOString().split('T')[0]

    // Code
    if (!form.code.trim())
      errs.code = 'Promo code is required.'
    else if (!/^[A-Z0-9_-]+$/i.test(form.code.trim()))
      errs.code = 'Only letters, numbers, hyphens, and underscores are allowed.'
    else if (form.code.trim().length < 3)
      errs.code = 'Code must be at least 3 characters.'
    else if (form.code.trim().length > 30)
      errs.code = 'Code must not exceed 30 characters.'

    // Discount value
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

    // Min order — optional but must be valid if provided
    if (form.minOrderAmount !== '') {
      if (isNaN(Number(form.minOrderAmount)))
        errs.minOrderAmount = 'Must be a valid number.'
      else if (Number(form.minOrderAmount) < 0)
        errs.minOrderAmount = 'Cannot be negative.'
    }

    // Max uses — optional but must be valid if provided
    if (form.maxUses !== '') {
      if (!Number.isInteger(Number(form.maxUses)) || Number(form.maxUses) < 1)
        errs.maxUses = 'Must be a whole number of at least 1.'
    }

    // Expiry date — optional but must be in the future if provided
    if (form.expiresAt && form.expiresAt < today)
      errs.expiresAt = 'Expiry date must be today or in the future.'

    // Description — optional length cap
    if (form.description.trim().length > 200)
      errs.description = 'Description must not exceed 200 characters.'

    return errs
  }

  // ── Form open helpers ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      code:           item.code,
      description:    item.description || '',
      discountType:   item.discountType,
      discountValue:  item.discountValue,
      minOrderAmount: item.minOrderAmount || '',
      maxUses:        item.maxUses ?? '',
      expiresAt:      item.expiresAt ? item.expiresAt.split('T')[0] : '',
    })
    setErrors({})
    setShowForm(true)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
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
    }
    if (editItem) await updatePromoCode(editItem._id, payload)
    else await addPromoCode(payload)
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this promo code?')) await deletePromoCode(id)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputCls = (field) =>
    `w-full px-4 py-2.5 border font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none transition-colors bg-white ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-violet-100 focus:border-violet-400'
    }`

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Violet Panel Header */}
      <div
        className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>
          Catalog
        </p>
        <div className='flex items-center justify-between'>
          <h1
            className='font-sans font-black text-white'
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
          >
            Promo Codes
          </h1>
          <button
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Promo Code</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Search */}
        <div className='bg-white border border-violet-100 px-5 py-4 mb-4'>
          <div className='relative'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 pointer-events-none'
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0'/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search by code or description...'
              className='w-full pl-9 pr-8 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
            />
            {search && (
              <button onClick={() => setSearch('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-violet-400 transition-colors'>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <div className='mb-4'>
          <p className='font-sans text-xs text-neutral-400'>
            Showing{' '}
            <span className='font-sans font-black text-neutral-700'>{filtered.length}</span>
            {' '}of {promoCodes.length} promo code{promoCodes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden'>

          {/* Header */}
          <div className='grid grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_1fr_1.4fr] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['Code', 'Discount', 'Min Order', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {promoCodes.length === 0 ? 'No promo codes yet.' : 'No promo codes match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {filtered.map(item => (
                <div key={item._id}
                  className='grid grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_1fr_1.4fr] items-start px-7 py-4 hover:bg-violet-50 transition-colors'>

                  {/* Code */}
                  <div>
                    <p className='font-sans font-black text-sm text-neutral-700 tracking-wider'>{item.code}</p>
                    {item.description && (
                      <p className='font-sans text-xs text-neutral-400 mt-0.5'>{item.description}</p>
                    )}
                  </div>

                  {/* Discount */}
                  <span className='font-sans font-black text-sm text-violet-600'>
                    {item.discountType === 'flat' ? `₱${item.discountValue} off` : `${item.discountValue}% off`}
                  </span>

                  {/* Min Order */}
                  <span className='font-sans text-sm text-neutral-500'>
                    {item.minOrderAmount > 0 ? `₱${item.minOrderAmount}` : '—'}
                  </span>

                  {/* Uses */}
                  <span className='font-sans font-black text-sm text-neutral-700'>
                    {item.usedCount}
                    <span className='font-sans font-normal text-neutral-400'>
                      {item.maxUses !== null ? ` / ${item.maxUses}` : ' / ∞'}
                    </span>
                  </span>

                  {/* Expires */}
                  <span className='font-sans text-xs text-neutral-500'>{formatDate(item.expiresAt)}</span>

                  {/* Status */}
                  {getStatusBadge(item)}

                  {/* Actions */}
                  <div className='flex items-center gap-3 flex-wrap'>
                    <button onClick={() => togglePromoCode(item._id)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 hover:text-violet-600 transition-colors'>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-violet-500 hover:text-violet-700 transition-colors'>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item._id)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-400 hover:text-red-600 transition-colors'>
                      Delete
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div
            className='bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            {/* Modal Header */}
            <div
              className='px-6 py-5 sticky top-0 z-10'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-0.5'>
                    Catalog
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {editItem ? 'Edit Promo Code' : 'Add New Promo Code'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-violet-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>

              {/* Summary error banner */}
              {Object.keys(errors).length > 1 && (
                <div className='border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2'>
                  <span className='text-red-400 text-sm mt-0.5 flex-shrink-0'>⚠</span>
                  <p className='font-sans text-xs text-red-600'>
                    Please fix <span className='font-bold'>{Object.keys(errors).length} errors</span> before saving.
                  </p>
                </div>
              )}

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>

                {/* Code */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Code <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    value={form.code}
                    onChange={set('code')}
                    placeholder='e.g. SAVE50'
                    className={`${inputCls('code')} uppercase`}
                  />
                  <FieldError message={errors.code} />
                </div>

                {/* Description */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Description
                    <span className='normal-case font-normal text-neutral-300 ml-2'>
                      ({form.description.length}/200)
                    </span>
                  </label>
                  <input
                    value={form.description}
                    onChange={set('description')}
                    placeholder='e.g. ₱50 off on all orders'
                    maxLength={200}
                    className={inputCls('description')}
                  />
                  <FieldError message={errors.description} />
                </div>

                {/* Discount Type */}
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

                {/* Discount Value */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Discount Value <span className='text-red-400 normal-case'>*</span>
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>
                      {form.discountType === 'flat' ? '(₱ amount)' : '(% e.g. 10)'}
                    </span>
                  </label>
                  <input
                    type='number'
                    value={form.discountValue}
                    onChange={set('discountValue')}
                    placeholder={form.discountType === 'flat' ? 'e.g. 50' : 'e.g. 10'}
                    min='0.01'
                    max={form.discountType === 'percent' ? 100 : undefined}
                    className={inputCls('discountValue')}
                  />
                  <FieldError message={errors.discountValue} />
                </div>

                {/* Min Order */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Min Order (₱)
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— optional</span>
                  </label>
                  <input
                    type='number'
                    value={form.minOrderAmount}
                    onChange={set('minOrderAmount')}
                    placeholder='e.g. 200'
                    min='0'
                    className={inputCls('minOrderAmount')}
                  />
                  <FieldError message={errors.minOrderAmount} />
                </div>

                {/* Max Uses */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Max Uses
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— blank = unlimited</span>
                  </label>
                  <input
                    type='number'
                    value={form.maxUses}
                    onChange={set('maxUses')}
                    placeholder='e.g. 100'
                    min='1'
                    step='1'
                    className={inputCls('maxUses')}
                  />
                  <FieldError message={errors.maxUses} />
                </div>

                {/* Expiry Date */}
                <div className='sm:col-span-2'>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Expiry Date
                    <span className='text-neutral-300 normal-case tracking-normal ml-1 font-normal'>— blank = no expiry</span>
                  </label>
                  <input
                    type='date'
                    value={form.expiresAt}
                    onChange={set('expiresAt')}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputCls('expiresAt')}
                  />
                  <FieldError message={errors.expiresAt} />
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className='px-6 pb-6 flex gap-3'>
              <button
                onClick={() => setShowForm(false)}
                className='group relative overflow-hidden flex-1 border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button
                onClick={handleSubmit}
                className='group relative overflow-hidden flex-1 bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{editItem ? 'Save Changes' : 'Add Promo Code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromoCodesList