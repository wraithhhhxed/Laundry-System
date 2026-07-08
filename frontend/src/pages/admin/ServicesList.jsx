// frontend/src/pages/admin/ServicesList.jsx
import { useContext, useEffect, useRef, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { X } from 'lucide-react'

const ServicesList = () => {
  const { services, getAllServices, addService, updateService, deleteService } = useContext(AdminContext)

  const [showForm, setShowForm]         = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [name, setName]                 = useState('')
  const [price, setPrice]               = useState('')
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [search, setSearch]             = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => { getAllServices() }, [])

  const openAdd = () => {
    setEditItem(null); setName(''); setPrice('')
    setImageFile(null); setImagePreview(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item); setName(item.name); setPrice(item.price)
    setImageFile(null); setImagePreview(item.image || null)
    setShowForm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!name.trim() || price === '') return
    const payload = { name: name.trim(), price: Number(price), isActive: true }
    if (editItem) await updateService(editItem._id, payload, imageFile)
    else          await addService(payload, imageFile)
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this service?')) await deleteService(id)
  }

  const handleToggle = async (item) => {
    await updateService(item._id, { isActive: !item.isActive })
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
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
            Services
          </h1>
          <button
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Service</span>
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
              placeholder='Search services...'
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
            {' '}of {services.length} service{services.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden'>

          {/* Header */}
          <div className='grid grid-cols-[2fr_1fr_1fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['Service', 'Price', 'Status', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {services.length === 0 ? 'No services yet.' : 'No services match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-violet-50'>
              {filtered.map(item => (
                <div key={item._id}
                  className='grid grid-cols-[2fr_1fr_1fr_auto] items-center px-7 py-4 hover:bg-violet-50 transition-colors'>

                  {/* Service */}
                  <div className='flex items-center gap-3'>
                    {item.image
                      ? <img src={item.image} className='w-9 h-9 object-cover flex-shrink-0' alt={item.name}/>
                      : <div className='w-9 h-9 bg-violet-50 flex items-center justify-center text-base flex-shrink-0'>🧺</div>
                    }
                    <span className='font-sans font-semibold text-sm text-neutral-700'>{item.name}</span>
                  </div>

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
                    {editItem ? 'Edit Service' : 'Add New Service'}
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
                    Service Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder='e.g. Wash Only'
                    className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
                  />
                </div>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Price (₱)
                  </label>
                  <input
                    type='number'
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder='e.g. 80'
                    min='0'
                    className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>
                  Service Image — optional
                </p>
                <div className='h-px bg-violet-100 mb-4' />
                <div className='flex items-center gap-4'>
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className='w-20 h-20 border border-violet-100 flex items-center justify-center cursor-pointer hover:border-violet-400 transition-colors overflow-hidden bg-neutral-50 flex-shrink-0'
                  >
                    {imagePreview
                      ? <img src={imagePreview} className='w-full h-full object-cover' alt='preview'/>
                      : <span className='text-2xl text-neutral-200'>📷</span>
                    }
                  </div>
                  <div>
                    <button
                      type='button'
                      onClick={() => fileInputRef.current.click()}
                      className='group relative overflow-hidden border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2'
                      style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                    >
                      <div className='absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                      <span className='relative z-10'>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                    </button>
                    {imagePreview && (
                      <button
                        type='button'
                        onClick={() => { setImageFile(null); setImagePreview(null); fileInputRef.current.value = '' }}
                        className='ml-2 font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-400 hover:text-red-600 transition-colors'
                      >
                        Remove
                      </button>
                    )}
                    <p className='font-sans text-xs text-neutral-300 mt-1.5'>JPG, PNG, WEBP — max 5MB</p>
                  </div>
                </div>
                <input ref={fileInputRef} type='file' accept='image/*' onChange={handleImageChange} className='hidden'/>
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
                <span className='relative z-10'>{editItem ? 'Save Changes' : 'Add Service'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesList