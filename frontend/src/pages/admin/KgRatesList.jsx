// frontend/src/pages/admin/KgRatesList.jsx
import { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { X } from 'lucide-react'

const KgRatesList = () => {
  const { kgRates, getAllKgRates, addKgRate, updateKgRate, deleteKgRate } = useContext(AdminContext)

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [kg, setKg]             = useState('')
  const [price, setPrice]       = useState('')

  useEffect(() => { getAllKgRates() }, [])

  const openAdd = () => {
    setEditItem(null); setKg(''); setPrice(''); setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item); setKg(item.kg); setPrice(item.price); setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!kg || price === '') return
    const payload = { kg: Number(kg), price: Number(price) }
    if (editItem) await updateKgRate(editItem._id, payload)
    else await addKgRate(payload)
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this KG rate?')) await deleteKgRate(id)
  }

  const handleToggle = async (item) => {
    await updateKgRate(item._id, { isActive: !item.isActive })
  }

  const existingKgs = kgRates.map(r => r.kg)
  const maxReached  = existingKgs.length >= 7

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
            KG Rates
          </h1>
          <button
            onClick={openAdd}
            disabled={maxReached}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add KG Rate</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Max reached notice */}
        {maxReached && (
          <div className='border border-violet-200 bg-violet-50 px-5 py-3 mb-6 flex items-center gap-3'>
            <span className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-violet-500'>
              All 7 KG rates (1kg–7kg) are set. Edit or delete existing rates to make changes.
            </span>
          </div>
        )}

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden mb-6'>

          {/* Header */}
          <div className='grid grid-cols-[1fr_1fr_1fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['Kilograms', 'Price', 'Status', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {kgRates.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              No KG rates yet
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {kgRates.map(item => (
                <div key={item._id}
                  className='grid grid-cols-[1fr_1fr_1fr_auto] items-center px-7 py-4 hover:bg-violet-50 transition-colors'>

                  {/* KG */}
                  <span className='font-sans font-black text-sm text-neutral-700'>
                    {item.kg} <span className='font-sans font-semibold text-neutral-400'>kg</span>
                  </span>

                  {/* Price */}
                  <span className='font-sans font-black text-sm text-violet-600'>
                    ₱{item.price}
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

        {/* Summary Cards */}
        {kgRates.length > 0 && (
          <div>
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>
              Current KG Pricing
            </p>
            <div className='h-px bg-violet-100 mb-4' />
            <div className='flex flex-wrap gap-3'>
              {kgRates.map(r => (
                <div
                  key={r._id}
                  className='bg-violet-600 px-6 py-4 min-w-[100px] text-center'
                  style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #7c3aed' }}
                >
                  <p className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-200 mb-1'>
                    {r.kg} kg
                  </p>
                  <p className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    ₱{r.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
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
                    Catalog
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {editItem ? 'Edit KG Rate' : 'Add New KG Rate'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-violet-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-5'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Kilograms
                  </label>
                  <select
                    value={kg}
                    onChange={e => setKg(e.target.value)}
                    disabled={!!editItem}
                    className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white disabled:bg-neutral-50 disabled:text-neutral-400'
                  >
                    <option value=''>Select KG</option>
                    {[1, 2, 3, 4, 5, 6, 7]
                      .filter(k => !existingKgs.includes(k) || (editItem && editItem.kg === k))
                      .map(k => (
                        <option key={k} value={k}>{k} kg</option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Price (₱)
                  </label>
                  <input
                    type='number'
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder='e.g. 60'
                    min='0'
                    className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
                  />
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
                <span className='relative z-10'>{editItem ? 'Save Changes' : 'Add KG Rate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KgRatesList