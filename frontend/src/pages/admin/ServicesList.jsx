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
  const [description, setDescription]   = useState('')
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [search, setSearch]             = useState('')
  const [nameError, setNameError]       = useState('')
  const [priceError, setPriceError]     = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => { getAllServices() }, [])

  // ─── VALIDATION ───────────────────────────────────────────────
  const validateServiceName = (value) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) return 'Service name must be at least 2 characters'
    if (!/^[A-Za-z0-9\s]+$/.test(trimmed)) return 'Service name can only contain letters, numbers, and spaces'
    return ''
  }

  const validatePrice = (value) => {
    const str = String(value).trim()
    if (str === '') return 'Price is required'
    if (!/^\d+(\.\d{1,2})?$/.test(str)) return 'Price must be a valid number (e.g. 80 or 80.50)'
    if (Number(str) <= 0) return 'Price must be greater than 0'
    if (Number(str) > 99999) return 'Price is too large'
    return ''
  }

  const openAdd = () => {
    setEditItem(null); setName(''); setPrice(''); setDescription('')
    setImageFile(null); setImagePreview(null)
    setNameError(''); setPriceError('')
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditItem(item); setName(item.name); setPrice(item.price); setDescription(item.description || '')
    setImageFile(null); setImagePreview(item.image || null)
    setNameError(''); setPriceError('')
    setShowForm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleNameChange = (e) => {
    const cleaned = e.target.value.replace(/[^A-Za-z0-9\s]/g, '')
    setName(cleaned)
    if (nameError) setNameError('')
  }

  const handleNameKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[A-Za-z0-9\s]/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handleNameBeforeInput = (e) => {
    const data = e.data || ''
    if (data && !/^[A-Za-z0-9\s]*$/.test(data)) {
      e.preventDefault()
    }
  }

  const handleNamePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = pasted.replace(/[^A-Za-z0-9\s]/g, '')
    setName(prev => prev + clean)
    if (nameError) setNameError('')
  }

  const handlePriceChange = (e) => {
    const raw = e.target.value
    let cleaned = raw.replace(/[^0-9.]/g, '')
    const firstDot = cleaned.indexOf('.')
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
    }
    const parts = cleaned.split('.')
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + '.' + parts[1].slice(0, 2)
    }
    setPrice(cleaned)
    if (priceError) setPriceError('')
  }

  const handlePriceKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[0-9.]/.test(e.key)) {
      e.preventDefault()
      return
    }
    if (e.key === '.' && String(price).includes('.')) {
      e.preventDefault()
    }
  }

  const handlePricePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    let clean = pasted.replace(/[^0-9.]/g, '')
    const firstDot = clean.indexOf('.')
    if (firstDot !== -1) {
      clean = clean.slice(0, firstDot + 1) + clean.slice(firstDot + 1).replace(/\./g, '')
    }
    setPrice(clean)
    if (priceError) setPriceError('')
  }

  const handleSubmit = async () => {
    const nameErr = validateServiceName(name)
    const priceErr = validatePrice(price)
    setNameError(nameErr)
    setPriceError(priceErr)
    if (nameErr || priceErr) return

    const payload = {
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      isActive: true,
    }
    if (editItem) await updateService(editItem.id, payload, imageFile)
    else          await addService(payload, imageFile)
    setShowForm(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this service?')) await deleteService(id)
  }

  const handleToggle = async (item) => {
    await updateService(item.id, { isActive: !item.isActive })
  }

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Blue Panel Header */}
      <div
        className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #1d4ed8' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>
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
        <div className='bg-white border border-blue-200 px-5 py-4 mb-4'>
          <div className='relative'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none'
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0'/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search services...'
              className='w-full pl-9 pr-8 py-2.5 border border-blue-200 font-sans text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors bg-white'
            />
            {search && (
              <button onClick={() => setSearch('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-500 transition-colors'>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <div className='mb-4'>
          <p className='font-sans text-xs text-neutral-500'>
            Showing{' '}
            <span className='font-sans font-black text-neutral-700'>{filtered.length}</span>
            {' '}of {services.length} service{services.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>

          {/* Header */}
          <div className='grid grid-cols-[0.4fr_2fr_0.8fr_0.8fr_1.2fr] bg-blue-50 border-b border-neutral-200'>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>No.</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Service</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Price</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Status</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3'>Actions</span>
          </div>

          {filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-400'>
              {services.length === 0 ? 'No services yet.' : 'No services match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-neutral-200'>
              {filtered.map((item, index) => (
                <div key={item.id}
                  className='grid grid-cols-[0.4fr_2fr_0.8fr_0.8fr_1.2fr] items-center hover:bg-blue-50 transition-colors'>

                  {/* Number */}
                  <span className='font-sans font-bold text-sm text-neutral-500 px-4 py-4 border-r border-neutral-200 text-center'>
                    {index + 1}
                  </span>

                  {/* Service */}
                  <div className='flex items-center gap-3 min-w-0 px-7 py-4 border-r border-neutral-200'>
                    {item.image
                      ? <img src={item.image} className='w-9 h-9 object-cover flex-shrink-0' alt={item.name}/>
                      : <div className='w-9 h-9 bg-blue-100 flex items-center justify-center text-base font-bold text-blue-700 flex-shrink-0'>S</div>
                    }
                    <div className='min-w-0 overflow-hidden'>
                      <span className='font-sans font-semibold text-sm text-neutral-800 block truncate'>{item.name}</span>
                      {item.description && (
                        <span className='font-sans text-xs text-neutral-500 block truncate' title={item.description}>{item.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <span className='font-sans font-black text-sm text-blue-700 px-7 py-4 border-r border-neutral-200'>
                    ₱{item.price}
                  </span>

                  {/* Status */}
                  <div className='px-7 py-4 border-r border-neutral-200'>
                    <span className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 w-fit ${
                      item.isActive
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-neutral-300 text-neutral-600 bg-neutral-100'
                    }`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className='flex items-center justify-start gap-4 px-7 py-4'>
                    <button onClick={() => handleToggle(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-blue-700 transition-colors'>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(item)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-blue-600 hover:text-blue-800 transition-colors'>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors'>
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
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #1d4ed8' }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>
                    Catalog
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {editItem ? 'Edit Service' : 'Add New Service'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-blue-200 hover:text-white transition-colors'>
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
                    onBeforeInput={handleNameBeforeInput}
                    onKeyDown={handleNameKeyDown}
                    onChange={handleNameChange}
                    onPaste={handleNamePaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. Wash Only'
                    autoComplete='off'
                    className={`w-full px-4 py-2.5 border font-sans text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors bg-white ${
                      nameError ? 'border-red-400 focus:border-red-500' : 'border-neutral-300 focus:border-blue-500'
                    }`}
                  />
                  {nameError && (
                    <p className='font-sans text-xs text-red-500 mt-1.5'>{nameError}</p>
                  )}
                </div>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Price (₱)
                  </label>
                  <input
                    type='text'
                    inputMode='decimal'
                    value={price}
                    onKeyDown={handlePriceKeyDown}
                    onChange={handlePriceChange}
                    onPaste={handlePricePaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. 80'
                    autoComplete='off'
                    className={`w-full px-4 py-2.5 border font-sans text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none transition-colors bg-white ${
                      priceError ? 'border-red-400 focus:border-red-500' : 'border-neutral-300 focus:border-blue-500'
                    }`}
                  />
                  {priceError && (
                    <p className='font-sans text-xs text-red-500 mt-1.5'>{priceError}</p>
                  )}
                </div>
              </div>

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                  Description — optional
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder='e.g. Drop off your laundry with 1 detergent and 1 fabric conditioner. Max 7kg per load.'
                  rows={3}
                  className='w-full px-4 py-2.5 border border-neutral-300 font-sans text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors bg-white resize-none'
                />
              </div>

              {/* Image Upload */}
              <div>
                <p className='uppercase tracking-[0.35em] text-[10px] text-blue-500 font-sans font-semibold mb-2'>
                  Service Image — optional
                </p>
                <div className='h-px bg-neutral-200 mb-4' />
                <div className='flex items-center gap-4'>
                  <div
                    onClick={() => fileInputRef.current.click()}
                    className='w-20 h-20 border border-neutral-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden bg-neutral-50 flex-shrink-0'
                  >
                    {imagePreview
                      ? <img src={imagePreview} className='w-full h-full object-cover' alt='preview'/>
                      : <span className='text-2xl text-neutral-300'>+</span>
                    }
                  </div>
                  <div>
                    <button
                      type='button'
                      onClick={() => fileInputRef.current.click()}
                      className='group relative overflow-hidden border border-blue-300 text-blue-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2'
                      style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                    >
                      <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                      <span className='relative z-10'>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                    </button>
                    {imagePreview && (
                      <button
                        type='button'
                        onClick={() => { setImageFile(null); setImagePreview(null); fileInputRef.current.value = '' }}
                        className='ml-2 font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors'
                      >
                        Remove
                      </button>
                    )}
                    <p className='font-sans text-xs text-neutral-400 mt-1.5'>JPG, PNG, WEBP — max 5MB</p>
                  </div>
                </div>
                <input ref={fileInputRef} type='file' accept='image/*' onChange={handleImageChange} className='hidden'/>
              </div>

            </div>

            {/* Modal Footer */}
            <div className='px-6 pb-6 flex gap-3'>
              <button
                onClick={() => setShowForm(false)}
                className='group relative overflow-hidden flex-1 border border-neutral-300 text-neutral-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-neutral-100 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button
                onClick={handleSubmit}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
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