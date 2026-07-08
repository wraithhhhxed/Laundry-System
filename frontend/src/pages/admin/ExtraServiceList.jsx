// frontend/src/pages/admin/ExtraServicesList.jsx
import { useEffect, useState, useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

// ─── Field error ──────────────────────────────────────────────────────────────
const FieldError = ({ message }) =>
  message
    ? <p className='font-sans text-[11px] text-red-500 mt-1 flex items-center gap-1'>
        <span>⚠</span> {message}
      </p>
    : null

const EMPTY_FORM = { name: '', description: '', fee: '' }

const ExtraServicesList = () => {
  const { aToken, backendUrl } = useContext(AdminContext)

  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editItem,   setEditItem]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [search,     setSearch]     = useState('')
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchItems = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(
        `${backendUrl}/api/admin/extra-services`,
        { headers: authHeader(aToken) }
      )
      if (data.success) setItems(data.extraServices ?? data.data?.extraServices ?? data.data ?? [])
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  // ─── Form helpers ───────────────────────────────────────────────────────────
  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const openAdd = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, description: item.description || '', fee: item.fee })
    setErrors({})
    setShowForm(true)
  }

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim())
      errs.name = 'Name is required.'
    else if (form.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters.'
    else if (form.name.trim().length > 80)
      errs.name = 'Name must not exceed 80 characters.'

    if (form.fee === '' || form.fee === null)
      errs.fee = 'Fee is required.'
    else if (isNaN(Number(form.fee)))
      errs.fee = 'Fee must be a valid number.'
    else if (Number(form.fee) < 0)
      errs.fee = 'Fee cannot be negative.'
    else if (Number(form.fee) > 99999)
      errs.fee = 'Fee seems too high. Please double-check.'

    if (form.description.trim().length > 200)
      errs.description = 'Description must not exceed 200 characters.'

    return errs
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        fee:         Number(form.fee),
      }
      const headers = authHeader(aToken)

      if (editItem) {
        const { data } = await axios.put(
          `${backendUrl}/api/admin/extra-services/${editItem._id}`,
          payload, { headers }
        )
        if (data.success) { toast.success('Extra service updated'); setShowForm(false); fetchItems() }
        else toast.error(data.message)
      } else {
        const { data } = await axios.post(
          `${backendUrl}/api/admin/extra-services`,
          payload, { headers }
        )
        if (data.success) { toast.success('Extra service created'); setShowForm(false); fetchItems() }
        else toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (item) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/extra-services/${item._id}/toggle`, {},
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success(data.message); fetchItems() }
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/extra-services/${item._id}`,
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success('Extra service deleted'); fetchItems() }
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  // ─── Filter ─────────────────────────────────────────────────────────────────
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(search.toLowerCase())
  )

  // ─── Input class ────────────────────────────────────────────────────────────
  const inputCls = (field) =>
    `w-full px-4 py-2.5 border font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none transition-colors bg-white ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-violet-100 focus:border-violet-400'
    }`

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Header */}
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
            Extra Services
          </h1>
          <button
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Extra Service</span>
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
              placeholder='Search extra services...'
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
            {' '}of {items.length} extra service{items.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden'>

          {/* Header */}
          <div className='grid grid-cols-[2fr_2fr_1fr_1fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['Service', 'Description', 'Fee', 'Status', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {items.length === 0 ? 'No extra services yet.' : 'No extra services match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {filtered.map(item => (
                <div key={item._id}
                  className='grid grid-cols-[2fr_2fr_1fr_1fr_auto] items-center px-7 py-4 hover:bg-violet-50 transition-colors'>

                  {/* Name */}
                  <span className='font-sans font-semibold text-sm text-neutral-700'>{item.name}</span>

                  {/* Description */}
                  <span className='font-sans text-xs text-neutral-400 truncate max-w-[200px]'>
                    {item.description || '—'}
                  </span>

                  {/* Fee */}
                  <span className='font-sans font-black text-sm text-violet-600'>
                    ₱{Number(item.fee).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>

                  {/* Status */}
                  <span className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 w-fit ${
                    item.isActive
                      ? 'border-green-200 text-green-600'
                      : 'border-neutral-200 text-neutral-400'
                  }`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>

                  {/* Actions */}
                  <div className='flex items-center gap-3'>
                    <button onClick={() => handleToggle(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 hover:text-violet-600 transition-colors'>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-violet-500 hover:text-violet-700 transition-colors'>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item)}
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
            className='bg-white w-full max-w-lg'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            {/* Modal Header */}
            <div
              className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-0.5'>
                    Catalog
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {editItem ? 'Edit Extra Service' : 'Add Extra Service'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-violet-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>

              {/* Error banner */}
              {Object.keys(errors).length > 1 && (
                <div className='border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2'>
                  <span className='text-red-400 text-sm mt-0.5 flex-shrink-0'>⚠</span>
                  <p className='font-sans text-xs text-red-600'>
                    Please fix <span className='font-bold'>{Object.keys(errors).length} errors</span> before saving.
                  </p>
                </div>
              )}

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>

                {/* Name */}
                <div className='sm:col-span-2'>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Service Name <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={set('name')}
                    placeholder='e.g. Folding / Tupi'
                    className={inputCls('name')}
                  />
                  <FieldError message={errors.name} />
                </div>

                {/* Fee */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Fee (₱) <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    type='number'
                    value={form.fee}
                    onChange={set('fee')}
                    placeholder='e.g. 50'
                    min='0'
                    step='0.01'
                    className={inputCls('fee')}
                  />
                  <FieldError message={errors.fee} />
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
                    placeholder='e.g. Professional folding after washing'
                    maxLength={200}
                    className={inputCls('description')}
                  />
                  <FieldError message={errors.description} />
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
                disabled={submitting}
                className='group relative overflow-hidden flex-1 bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>
                  {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Service'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExtraServicesList