// frontend/src/pages/admin/ClothingTypesList.jsx
import { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { X } from 'lucide-react'

const ClothingTypesList = () => {
  const { clothingTypes, getAllClothingTypes, addClothingType, updateClothingType, deleteClothingType } = useContext(AdminContext)

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [name, setName]         = useState('')
  const [isActive, setIsActive] = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => { getAllClothingTypes() }, [])

  const openAdd = () => {
    setEditItem(null); setName(''); setIsActive(true); setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item); setName(item.name); setIsActive(item.isActive); setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const payload = { name: name.trim(), isActive }
    if (editItem) await updateClothingType(editItem.id, payload)
    else await addClothingType(payload)
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this clothing type?')) await deleteClothingType(id)
  }

  const filtered = clothingTypes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

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
            Clothing Types
          </h1>
          <button
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Clothing Type</span>
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
              placeholder='Search clothing types...'
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
            {' '}of {clothingTypes.length} clothing type{clothingTypes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden'>

          {/* Header */}
          <div className='grid grid-cols-[2fr_1fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['Clothing Type', 'Status', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {clothingTypes.length === 0 ? 'No clothing types yet.' : 'No clothing types match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {filtered.map(item => (
                <div key={item.id}
                  className='grid grid-cols-[2fr_1fr_auto] items-center px-7 py-4 hover:bg-violet-50 transition-colors'>

                  {/* Name */}
                  <span className='font-sans font-semibold text-sm text-neutral-700'>{item.name}</span>

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
                    <button onClick={() => openEdit(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-violet-500 hover:text-violet-700 transition-colors'>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)}
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
                    {editItem ? 'Edit Clothing Type' : 'Add New Clothing Type'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-violet-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-5'>

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                  Clothing Type Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='e.g. Regular Clothes'
                  className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
                />
              </div>

              <div className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  id='activeClothing'
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className='w-4 h-4 accent-violet-600'
                />
                <label htmlFor='activeClothing' className='font-sans text-sm text-neutral-600'>
                  Active <span className='text-neutral-400'>(visible to users)</span>
                </label>
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
                <span className='relative z-10'>{editItem ? 'Save Changes' : 'Add Clothing Type'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClothingTypesList