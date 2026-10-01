// frontend/src/pages/admin/ProductManagement.jsx
import { useContext, useEffect, useState, useRef } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const CATEGORIES = ['detergent', 'conditioner', 'bleach', 'other']

const CAT_COLORS = {
  detergent:   'border-blue-200 text-blue-600',
  conditioner: 'border-indigo-200 text-indigo-600',
  bleach:      'border-amber-200 text-amber-600',
  other:       'border-neutral-200 text-neutral-500',
}

const CategoryBadge = ({ category }) => (
  <span className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 ${CAT_COLORS[category] || CAT_COLORS.other}`}>
    {category}
  </span>
)

// ── Sanitizers ───────────────────────────────────────────────────────────────
const sanitizeName = (v) =>
  String(v || '')
    .replace(/[^A-Za-z0-9\s.,'&()-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9]+/, '')

const sanitizeDescription = (v) =>
  String(v || '')
    .replace(/[^A-Za-z0-9\s.,'&()!?%₱/-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[^A-Za-z0-9\s]+/, '')
    .slice(0, 500)

const sanitizePrice = (v) => {
  let s = String(v ?? '').replace(/[^0-9.]/g, '')
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  const parts = s.split('.')
  if (parts[1] && parts[1].length > 2) {
    s = parts[0] + '.' + parts[1].slice(0, 2)
  }
  return s
}

// ── Field error message ──────────────────────────────────────────────────────
const FieldError = ({ message }) =>
  message
    ? <p className='font-sans text-[11px] text-red-500 mt-1'>
        {message}
      </p>
    : null

const ProductManagement = () => {
  const { aToken, backendUrl } = useContext(AdminContext)

  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search,       setSearch]       = useState('')

  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [price,        setPrice]        = useState('')
  const [category,     setCategory]     = useState('detergent')
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileRef = useRef()

  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    const trimmedName = name.trim()

    if (!trimmedName)
      errs.name = 'Product name is required.'
    else if (trimmedName.length < 2)
      errs.name = 'Name must be at least 2 characters.'
    else if (trimmedName.length > 100)
      errs.name = 'Name must not exceed 100 characters.'
    else if (!/^[A-Za-z0-9\s.,'&()-]+$/.test(trimmedName))
      errs.name = 'Name can only contain letters, numbers, spaces, and basic punctuation.'

    const priceStr = String(price).trim()
    if (priceStr === '')
      errs.price = 'Price is required.'
    else if (!/^\d+(\.\d{1,2})?$/.test(priceStr))
      errs.price = 'Price must be a valid number (e.g. 25 or 25.50).'
    else if (Number(priceStr) <= 0)
      errs.price = 'Price must be greater than 0.'
    else if (Number(priceStr) > 999999)
      errs.price = 'Price seems too high. Please double-check.'

    if (!category)
      errs.category = 'Please select a category.'

    const trimmedDesc = description.trim()
    if (trimmedDesc.length > 500)
      errs.description = 'Description must not exceed 500 characters.'
    else if (trimmedDesc && !/^[A-Za-z0-9\s.,'&()!?%₱/-]+$/.test(trimmedDesc))
      errs.description = 'Description can only contain letters, numbers, spaces, and basic punctuation.'

    if (imageFile) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(imageFile.type))
        errs.image = 'Only JPG, PNG, or WEBP images are allowed.'
      else if (imageFile.size > 5 * 1024 * 1024)
        errs.image = 'Image must be smaller than 5MB.'
    }

    return errs
  }

  const clearError = (field) => {
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  // ── Input handlers ─────────────────────────────────────────────────────────
  const handleNameChange = (e) => {
    const cleaned = sanitizeName(e.target.value)
    setName(cleaned)
    clearError('name')
  }
  const handleNameKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[A-Za-z0-9\s.,'&()-]/.test(e.key)) { e.preventDefault(); return }
    if (!name && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
  }
  const handleNameBeforeInput = (e) => {
    const data = e.data || ''
    if (data && !/^[A-Za-z0-9\s.,'&()-]*$/.test(data)) { e.preventDefault(); return }
    if (data && !name && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
  }
  const handleNamePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeName(pasted)
    setName(sanitizeName(name + ' ' + clean))
    clearError('name')
  }

  const handlePriceChange = (e) => {
    const cleaned = sanitizePrice(e.target.value)
    setPrice(cleaned)
    clearError('price')
  }
  const handlePriceKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[0-9.]/.test(e.key)) { e.preventDefault(); return }
    if (e.key === '.' && String(price).includes('.')) e.preventDefault()
  }
  const handlePricePaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    setPrice(sanitizePrice(pasted))
    clearError('price')
  }

  const handleDescriptionChange = (e) => {
    const cleaned = sanitizeDescription(e.target.value)
    setDescription(cleaned)
    clearError('description')
  }
  const handleDescriptionKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key === ' ') return
    if (e.key.length === 1 && !/[A-Za-z0-9.,'&()!?%₱/-]/.test(e.key)) e.preventDefault()
    if (!description && e.key.length === 1 && !/[A-Za-z0-9\s]/.test(e.key)) e.preventDefault()
  }
  const handleDescriptionBeforeInput = (e) => {
    const data = e.data || ''
    if (data && !/^[A-Za-z0-9\s.,'&()!?%₱/-]*$/.test(data)) { e.preventDefault(); return }
    if (data && !description && !/^[A-Za-z0-9\s]/.test(data)) e.preventDefault()
  }
  const handleDescriptionPaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeDescription(pasted)
    setDescription(sanitizeDescription(description + ' ' + clean))
    clearError('description')
  }

  const handleSearchChange = (e) => {
    const cleaned = String(e.target.value || '').replace(/[^A-Za-z0-9\s.,'&()-]/g, '')
    setSearch(cleaned)
  }
  const handleSearchKeyDown = (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[A-Za-z0-9\s.,'&()-]/.test(e.key)) e.preventDefault()
  }
  const handleSearchPaste = (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    setSearch(pasted.replace(/[^A-Za-z0-9\s.,'&()-]/g, ''))
  }

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(
        `${backendUrl}/api/products?includeInactive=true`,
        { headers: authHeader(aToken) }
      )
      if (data.success) setProducts(data.data)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  // ── Form helpers ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null)
    setName(''); setDescription(''); setPrice(''); setCategory('detergent')
    setImageFile(null); setImagePreview(null)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (product) => {
    setEditItem(product)
    setName(sanitizeName(product.name))
    setDescription(sanitizeDescription(product.description || ''))
    setPrice(sanitizePrice(product.price))
    setCategory(product.category)
    setImageFile(null)
    setImagePreview(product.image || null)
    setErrors({})
    setShowForm(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    clearError('image')
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('description', description.trim())
      formData.append('price', Number(price))
      formData.append('category', category)
      if (imageFile) formData.append('image', imageFile)

      const headers = { ...authHeader(aToken), 'Content-Type': 'multipart/form-data' }

      if (editItem) {
        const { data } = await axios.put(`${backendUrl}/api/products/${editItem.id}`, formData, { headers })
        if (data.success) { toast.success('Product updated'); setShowForm(false); fetchProducts() }
        else toast.error(data.message)
      } else {
        const { data } = await axios.post(`${backendUrl}/api/products`, formData, { headers })
        if (data.success) { toast.success('Product created'); setShowForm(false); fetchProducts() }
        else toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── CRUD actions ───────────────────────────────────────────────────────────
  const handleToggle = async (product) => {
    try {
      const { data } = await axios.patch(
        `${backendUrl}/api/products/${product.id}/toggle`, {},
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success(data.message); fetchProducts() }
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/products/${product.id}`,
        { headers: authHeader(aToken) }
      )
      if (data.success) { toast.success('Product deleted'); fetchProducts() }
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    if (filterCat !== 'all' && p.category !== filterCat) return false
    if (filterStatus === 'active'   && !p.isActive) return false
    if (filterStatus === 'inactive' &&  p.isActive) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const inName = p.name?.toLowerCase().includes(q)
      const inDesc = p.description?.toLowerCase().includes(q)
      if (!inName && !inDesc) return false
    }
    return true
  })

  const hasFilters = search || filterCat !== 'all' || filterStatus !== 'all'
  const clearFilters = () => { setSearch(''); setFilterCat('all'); setFilterStatus('all') }

  // ── Shared input classes ───────────────────────────────────────────────────
  const inputCls = (field) =>
    `w-full px-4 py-2.5 border font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none transition-colors bg-white ${
      errors[field]
        ? 'border-red-300 focus:border-red-400 bg-red-50/30'
        : 'border-blue-100 focus:border-blue-400'
    }`

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Blue Panel Header */}
      <div
        className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>
          Catalog
        </p>
        <div className='flex items-center justify-between'>
          <h1
            className='font-sans font-black text-white'
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
          >
            Products
          </h1>
          <button
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Product</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Filters */}
        <div className='bg-white border border-blue-100 px-5 py-4 mb-4 flex flex-wrap gap-3 items-center'>

          <div className='relative flex-1 min-w-[200px]'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 pointer-events-none'
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' />
            </svg>
            <input
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onPaste={handleSearchPaste}
              onDrop={e => e.preventDefault()}
              placeholder='Search by name or description...'
              autoComplete='off'
              className='w-full pl-9 pr-8 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className='px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white'
          >
            <option value='all'>All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className='px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white'
          >
            <option value='all'>All Status</option>
            <option value='active'>Active</option>
            <option value='inactive'>Inactive</option>
          </select>

          <div className='flex items-center gap-3 ml-auto'>
            <span className='font-sans text-xs text-neutral-400'>
              <span className='font-sans font-black text-neutral-700'>{filtered.length}</span>{' '}
              product{filtered.length !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className='font-sans text-xs text-blue-500 hover:text-blue-700 transition-colors'
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>

          {/* Header with No. column */}
          <div className='grid grid-cols-[0.3fr_2fr_1fr_1fr_0.9fr_1.6fr] bg-blue-50 border-b border-neutral-200'>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-3 py-3 border-r border-neutral-200 text-center'>No.</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-left'>Product</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Category</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Price</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Status</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 text-center'>Actions</span>
          </div>

          {loading ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {products.length === 0 ? 'No products yet.' : 'No products match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-neutral-200'>
              {filtered.map((product, index) => (
                <div key={product.id}
                  className='grid grid-cols-[0.3fr_2fr_1fr_1fr_0.9fr_1.6fr] items-center hover:bg-blue-50 transition-colors'>

                  {/* Number */}
                  <div className='px-3 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans font-bold text-sm text-neutral-500'>{index + 1}</span>
                  </div>

                  {/* Product */}
                  <div className='flex items-center gap-3 px-4 py-4 border-r border-neutral-200'>
                    {product.image
                      ? <img src={product.image} alt={product.name}
                          className='w-10 h-10 object-cover border border-neutral-200 flex-shrink-0' />
                      : <div className='w-10 h-10 bg-blue-50 flex items-center justify-center flex-shrink-0'>
                          <span className='font-sans font-black text-blue-400 text-xs'>
                            {product.name[0]?.toUpperCase()}
                          </span>
                        </div>
                    }
                    <div className='min-w-0'>
                      <p className='font-sans font-semibold text-sm text-neutral-700 truncate'>
                        {search.trim() ? highlightMatch(product.name, search.trim()) : product.name}
                      </p>
                      {product.description && (
                        <p className='font-sans text-xs text-neutral-400 truncate max-w-[220px]'>
                          {search.trim() ? highlightMatch(product.description, search.trim()) : product.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div className='px-4 py-4 border-r border-neutral-200 flex justify-center'>
                    <CategoryBadge category={product.category} />
                  </div>

                  {/* Price */}
                  <div className='px-4 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className='font-sans font-black text-sm text-blue-600'>
                      ₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Status */}
                  <div className='px-4 py-4 border-r border-neutral-200 flex justify-center'>
                    <span className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 whitespace-nowrap ${
                      product.isActive
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-neutral-300 text-neutral-600 bg-neutral-100'
                    }`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className='flex items-center justify-center gap-3 px-4 py-4'>
                    <button onClick={() => openEdit(product)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap'>
                      Edit
                    </button>
                    <button onClick={() => handleToggle(product)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-blue-700 transition-colors whitespace-nowrap'>
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(product)}
                      className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors whitespace-nowrap'>
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
                    {editItem ? 'Edit Product' : 'Add New Product'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-blue-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-5'>

              {Object.keys(errors).length > 1 && (
                <div className='border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2'>
                  <span className='text-red-400 text-sm mt-0.5 flex-shrink-0'>!</span>
                  <p className='font-sans text-xs text-red-600'>
                    Please fix <span className='font-bold'>{Object.keys(errors).length} errors</span> before saving.
                  </p>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <p className='uppercase tracking-[0.35em] text-[10px] text-blue-500 font-sans font-semibold mb-2'>
                  Product Image
                </p>
                <div className='h-px bg-neutral-200 mb-4' />
                <div className='flex items-center gap-4'>
                  <div
                    onClick={() => fileRef.current.click()}
                    className={`w-20 h-20 border flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden bg-neutral-50 flex-shrink-0 ${
                      errors.image ? 'border-red-400' : 'border-neutral-300'
                    }`}
                  >
                    {imagePreview
                      ? <img src={imagePreview} alt='preview' className='w-full h-full object-cover' />
                      : <span className='font-sans text-xs text-neutral-400 text-center px-1'>Click to upload</span>
                    }
                  </div>
                  <div>
                    <button
                      type='button'
                      onClick={() => fileRef.current.click()}
                      className='group relative overflow-hidden border border-blue-300 text-blue-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2'
                      style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                    >
                      <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                      <span className='relative z-10'>{imagePreview ? 'Change' : 'Upload'}</span>
                    </button>
                    <p className='font-sans text-xs text-neutral-400 mt-1.5'>JPG, PNG, WEBP · max 5MB</p>
                    {imageFile && <p className='font-sans text-xs text-blue-600 mt-0.5'>{imageFile.name}</p>}
                    <FieldError message={errors.image} />
                  </div>
                </div>
                <input ref={fileRef} type='file' accept='image/*' onChange={handleImageChange} className='hidden' />
              </div>

              {/* Fields */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>

                <div className='sm:col-span-2'>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Name <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    type='text'
                    value={name}
                    onBeforeInput={handleNameBeforeInput}
                    onKeyDown={handleNameKeyDown}
                    onChange={handleNameChange}
                    onPaste={handleNamePaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. Ariel Liquid Detergent'
                    autoComplete='off'
                    className={inputCls('name')}
                  />
                  <FieldError message={errors.name} />
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Category <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => { setCategory(e.target.value); clearError('category') }}
                    className={inputCls('category')}
                  >
                    <option value=''>Select category...</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <FieldError message={errors.category} />
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Price (₱) <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    type='text'
                    inputMode='decimal'
                    value={price}
                    onKeyDown={handlePriceKeyDown}
                    onChange={handlePriceChange}
                    onPaste={handlePricePaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. 25'
                    autoComplete='off'
                    className={inputCls('price')}
                  />
                  <FieldError message={errors.price} />
                </div>

                <div className='sm:col-span-2'>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Description
                    <span className='normal-case font-normal text-neutral-300 ml-2'>
                      ({description.length}/500)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onBeforeInput={handleDescriptionBeforeInput}
                    onKeyDown={handleDescriptionKeyDown}
                    onChange={handleDescriptionChange}
                    onPaste={handleDescriptionPaste}
                    onDrop={e => e.preventDefault()}
                    placeholder='Optional short description...'
                    rows={3}
                    maxLength={500}
                    autoComplete='off'
                    className={`${inputCls('description')} resize-none`}
                  />
                  <FieldError message={errors.description} />
                </div>

              </div>
            </div>

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
                disabled={submitting}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>
                  {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Product'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const highlightMatch = (text, query) => {
  if (!text || !query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className='bg-blue-100 text-blue-700 font-black rounded-none px-0'>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default ProductManagement