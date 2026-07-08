import { useState, useEffect, useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'

const VALID_STATUSES = [
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved',         label: 'Approved' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'delivered',        label: 'Delivered' },
]

const STATUS_COLORS = {
  pending_approval: 'border-amber-200 text-amber-600',
  approved:         'border-blue-200 text-blue-600',
  cancelled:        'border-red-200 text-red-500',
  delivered:        'border-green-200 text-green-600',
}

const emptyForm = { reason: '', applicableStatuses: [], isActive: true }

const RefundReasonsSettings = () => {
  const { getRefundReasons, updateRefundReasons } = useContext(AdminContext)

  const [reasons,  setReasons]  = useState([])
  const [fetching, setFetching] = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form,     setForm]     = useState(emptyForm)

  useEffect(() => { fetchReasons() }, [])

  const fetchReasons = async () => {
    setFetching(true)
    const data = await getRefundReasons()
    if (data) setReasons(data)
    setFetching(false)
  }

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item, idx) => {
    setEditItem(idx)
    setForm({ reason: item.reason, applicableStatuses: [...item.applicableStatuses], isActive: item.isActive })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditItem(null); setForm(emptyForm) }

  const toggleFormStatus = (status) => {
    setForm(prev => ({
      ...prev,
      applicableStatuses: prev.applicableStatuses.includes(status)
        ? prev.applicableStatuses.filter(s => s !== status)
        : [...prev.applicableStatuses, status],
    }))
  }

  const handleSubmit = () => {
    if (!form.reason.trim())                  { toast.error('Reason label is required.'); return }
    if (form.applicableStatuses.length === 0) { toast.error('Select at least one status.'); return }
    if (editItem !== null) {
      setReasons(prev => prev.map((r, i) => i === editItem ? { ...form, reason: form.reason.trim() } : r))
    } else {
      setReasons(prev => [...prev, { ...form, reason: form.reason.trim() }])
    }
    closeForm()
  }

  const handleDelete = (idx) => {
    if (!window.confirm('Delete this refund reason?')) return
    setReasons(prev => prev.filter((_, i) => i !== idx))
  }

  const toggleActive = (idx) => {
    setReasons(prev => prev.map((r, i) => i === idx ? { ...r, isActive: !r.isActive } : r))
  }

  const moveUp = (idx) => {
    if (idx === 0) return
    setReasons(prev => { const n = [...prev]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; return n })
  }

  const moveDown = (idx) => {
    setReasons(prev => {
      if (idx === prev.length - 1) return prev
      const n = [...prev]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; return n
    })
  }

  const handleSave = async () => {
    setSaving(true)
    await updateRefundReasons(reasons)
    setSaving(false)
  }

  if (fetching) {
    return (
      <div className='bg-neutral-50 min-h-screen w-full flex items-center justify-center'
        style={{ fontFamily: "'Georgia', serif" }}>
        <span className='font-sans text-sm text-neutral-300 uppercase tracking-[0.2em]'>Loading…</span>
      </div>
    )
  }

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Violet Panel Header */}
      <div
        className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>
          Settings
        </p>
        <div className='flex items-center justify-between'>
          <h1
            className='font-sans font-black text-white'
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
          >
            Refund Reasons
          </h1>
          <button
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Reason</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden mb-4'>

          {/* Table Header */}
          <div className='grid grid-cols-[2rem_1fr_1.4fr_0.7fr_0.5fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['#', 'Reason', 'Applicable Statuses', 'Status', 'Order', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {reasons.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              No refund reasons yet
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {reasons.map((item, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-[2rem_1fr_1.4fr_0.7fr_0.5fr_auto] items-center px-7 py-4 hover:bg-violet-50 transition-colors ${!item.isActive ? 'opacity-40' : ''}`}
                >
                  {/* # */}
                  <span className='font-sans text-xs text-neutral-400'>{idx + 1}</span>

                  {/* Reason */}
                  <span className='font-sans font-black text-sm text-neutral-700'>{item.reason}</span>

                  {/* Statuses */}
                  <div className='flex flex-wrap gap-1.5'>
                    {item.applicableStatuses.map(s => (
                      <span
                        key={s}
                        className={`uppercase tracking-[0.15em] text-[9px] font-sans font-bold border px-2 py-0.5 ${STATUS_COLORS[s] || 'border-neutral-200 text-neutral-400'}`}
                      >
                        {VALID_STATUSES.find(v => v.value === s)?.label ?? s}
                      </span>
                    ))}
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(idx)}
                    className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 w-fit transition-colors ${
                      item.isActive
                        ? 'border-green-200 text-green-600 hover:bg-green-50'
                        : 'border-neutral-200 text-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Hidden'}
                  </button>

                  {/* Order */}
                  <div className='flex items-center gap-1'>
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className='font-sans text-[11px] text-violet-400 hover:text-violet-700 disabled:opacity-20 transition-colors px-1'
                    >▲</button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === reasons.length - 1}
                      className='font-sans text-[11px] text-violet-400 hover:text-violet-700 disabled:opacity-20 transition-colors px-1'
                    >▼</button>
                  </div>

                  {/* Actions */}
                  <div className='flex items-center gap-3'>
                    <button onClick={() => openEdit(item, idx)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-violet-500 hover:text-violet-700 transition-colors'>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(idx)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-400 hover:text-red-600 transition-colors'>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className='flex justify-end'>
          <button
            onClick={handleSave}
            disabled={saving}
            className='group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center px-8 py-2.5 disabled:opacity-50'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div
            className='bg-white w-full max-w-md'
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
                    Settings
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {editItem !== null ? 'Edit Refund Reason' : 'Add Refund Reason'}
                  </h2>
                </div>
                <button onClick={closeForm} className='text-violet-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-5'>

              {/* Reason Label */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                  Reason Label <span className='text-red-400'>*</span>
                </label>
                <input
                  type='text'
                  value={form.reason}
                  onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder='e.g. Damaged clothing'
                  className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
                />
              </div>

              {/* Applicable Statuses */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-2'>
                  Show when appointment is <span className='text-red-400'>*</span>
                </label>
                <div className='flex flex-wrap gap-2'>
                  {VALID_STATUSES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => toggleFormStatus(s.value)}
                      className={`font-sans text-[10px] font-bold uppercase tracking-[0.15em] border px-3 py-1.5 transition-colors ${
                        form.applicableStatuses.includes(s.value)
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-neutral-400 border-violet-100 hover:border-violet-400 hover:text-violet-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active checkbox */}
              <div className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  id='reasonActive'
                  checked={form.isActive}
                  onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className='w-4 h-4 accent-violet-600'
                />
                <label htmlFor='reasonActive' className='font-sans text-sm text-neutral-600'>
                  Active <span className='text-neutral-400'>(visible to users)</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='px-6 pb-6 flex gap-3'>
              <button
                onClick={closeForm}
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
                <span className='relative z-10'>{editItem !== null ? 'Save Changes' : 'Add Reason'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RefundReasonsSettings