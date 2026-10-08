// frontend/src/pages/admin/AdminInventory.jsx
import { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const clip = { clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }
const clipModal = { clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }
const headerBg = { background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }

const MAX_QUANTITY = 999999

// ─── Sanitizer: whole numbers only, no minus/special/decimal ────────────────
const sanitizeInt = (v) =>
  String(v ?? '').replace(/[^0-9]/g, '')

// ─── Search sanitizer: letters, numbers, spaces, hyphens, dots only ─────────
const sanitizeSearch = (v) =>
  String(v ?? '').replace(/[^A-Za-z0-9\s.\-]/g, '')

const AdminInventory = () => {
  const { aToken, backendUrl, branches, getAllBranches } = useContext(AdminContext)

  const [selectedBranch, setSelectedBranch] = useState('')
  const [inventory,      setInventory]      = useState([])
  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(false)
  const [search,         setSearch]         = useState('')
  const [staffMap,       setStaffMap]       = useState({})
  const [showInactive,   setShowInactive]   = useState(false)

  const [modal,      setModal]      = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [productId,         setProductId]         = useState('')
  const [quantity,          setQuantity]           = useState('')
  const [lowStockThreshold, setLowStockThreshold]  = useState('')
  const [addQuantity,       setAddQuantity]        = useState('')
  const [errors,            setErrors]             = useState({})

  // ── Load branches + product catalog on mount ─────────────────────────────
  useEffect(() => {
    if (aToken) {
      getAllBranches()
      fetchProducts()
    }
  }, [aToken])

  useEffect(() => {
    if (!selectedBranch && branches?.length > 0) {
      const main = branches.find(b => b.name.trim().toLowerCase() === 'hagonoy') || branches[0]
      setSelectedBranch(main.id)
    }
  }, [branches])

  useEffect(() => {
    if (selectedBranch) {
      fetchInventory(selectedBranch)
      fetchStaff(selectedBranch)
    }
  }, [selectedBranch])

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/products`, { headers: authHeader(aToken) })
      if (data.success) setProducts(data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const fetchInventory = async (branchId) => {
    try {
      setLoading(true)
      const { data } = await axios.get(
        `${backendUrl}/api/inventory/branch/${branchId}`,
        { headers: authHeader(aToken) }
      )
      if (data.success) setInventory(data.data)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async (branchId) => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/admin/staff/${branchId}`,
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        const map = {}
        data.data.staff.forEach(s => {
          map[s.id] = `${s.firstName} ${s.lastName}`
        })
        setStaffMap(map)
      }
    } catch (err) {
      // silent fail
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setProductId(''); setQuantity(''); setLowStockThreshold(''); setErrors({})
    setModal({ mode: 'set' })
    setShowInactive(false)
  }

  const openSet = (item) => {
    setProductId((item.productId ?? item.product?.id)?.toString())
    setQuantity(sanitizeInt(item.quantity))
    setLowStockThreshold(item.lowStockThreshold != null ? sanitizeInt(item.lowStockThreshold) : '')
    setErrors({})
    setModal({ mode: 'set', item })
  }

  const openRestock = (item) => {
    setProductId((item.productId ?? item.product?.id)?.toString())
    setAddQuantity('')
    setErrors({})
    setModal({ mode: 'restock', item })
  }

  const closeModal = () => setModal(null)

  // ── Input handlers (numbers only) ────────────────────────────────────────
  const makeIntKeyDownHandler = (currentValue) => (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault()
    if (
      e.key.length === 1 &&
      currentValue === '0' &&
      e.key !== '0'
    ) {
      return
    }
  }

  const makeIntPasteHandler = (setter) => (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const clean = sanitizeInt(pasted)
    setter(clean)
  }

  // ── Submit: set stock ────────────────────────────────────────────────────
  const handleSetStock = async () => {
    const errs = {}
    if (!productId) errs.productId = 'Choose a product.'

    const qtyStr = String(quantity).trim()
    if (qtyStr === '')
      errs.quantity = 'Quantity is required.'
    else if (!/^\d+$/.test(qtyStr))
      errs.quantity = 'Quantity must be a whole number (no decimals, no special characters).'
    else if (Number(qtyStr) > MAX_QUANTITY)
      errs.quantity = `Quantity is too large (max ${MAX_QUANTITY.toLocaleString()}).`

    const thresholdStr = String(lowStockThreshold).trim()
    if (thresholdStr !== '') {
      if (!/^\d+$/.test(thresholdStr))
        errs.lowStockThreshold = 'Low stock threshold must be a whole number.'
      else if (Number(thresholdStr) > MAX_QUANTITY)
        errs.lowStockThreshold = `Threshold is too large (max ${MAX_QUANTITY.toLocaleString()}).`
    }

    if (Object.keys(errs).length) return setErrors(errs)

    setSubmitting(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/inventory/set`,
        {
          branchId: selectedBranch,
          productId,
          quantity: Number(qtyStr),
          lowStockThreshold: thresholdStr === '' ? undefined : Number(thresholdStr),
        },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success('Stock na-set na')
        closeModal()
        fetchInventory(selectedBranch)
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit: restock ──────────────────────────────────────────────────────
  const handleRestock = async () => {
    const errs = {}
    const qtyStr = String(addQuantity).trim()
    if (qtyStr === '')
      errs.addQuantity = 'Add quantity is required.'
    else if (!/^\d+$/.test(qtyStr))
      errs.addQuantity = 'Add quantity must be a whole number (no decimals, no special characters).'
    else if (Number(qtyStr) <= 0)
      errs.addQuantity = 'Add quantity must be greater than 0.'
    else if (Number(qtyStr) > MAX_QUANTITY)
      errs.addQuantity = `Add quantity is too large (max ${MAX_QUANTITY.toLocaleString()}).`

    if (Object.keys(errs).length) return setErrors(errs)

    setSubmitting(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/inventory/restock`,
        { branchId: selectedBranch, productId, addQuantity: Number(qtyStr) },
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success('Restocked')
        closeModal()
        fetchInventory(selectedBranch)
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Remove product from branch ───────────────────────────────────────────
  const handleRemove = async (item) => {
    const name = item.product?.name || 'this product'
    if (!window.confirm(`Alisin ang "${name}" sa inventory ng branch na ito?`)) return
    try {
      const pid = item.productId ?? item.product?.id
      const { data } = await axios.delete(
        `${backendUrl}/api/inventory/${pid}?branchId=${selectedBranch}`,
        { headers: authHeader(aToken) }
      )
      if (data.success) {
        toast.success('Natanggal na')
        fetchInventory(selectedBranch)
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  // ── Products na wala pa sa inventory ─────────────────────────────────────
  const inventoryProductIds = inventory.map(i => (i.productId ?? i.product?.id)?.toString())
  const availableProducts = products
    .filter(p => !inventoryProductIds.includes(p.id?.toString()))
    .filter(p => showInactive || p.isActive)

  // ── Filtering (search) ────────────────────────────────────────────────────
  const filtered = inventory.filter(i => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (i.product?.name || '').toLowerCase().includes(q)
  })

  const inputCls = (field) =>
    `w-full px-4 py-2.5 border font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none transition-colors bg-white ${
      errors[field] ? 'border-red-300 focus:border-red-400 bg-red-50/30' : 'border-blue-100 focus:border-blue-400'
    }`

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div className='bg-blue-600 px-7 py-6 mb-8' style={headerBg}>
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>
          Operations
        </p>
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>
            Branch Inventory
          </h1>
          <button
            onClick={openAdd}
            disabled={!selectedBranch}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-50'
            style={clip}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add / Set Stock</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Branch selector + search */}
        <div className='bg-white border border-blue-100 px-5 py-4 mb-4 flex flex-wrap gap-3 items-center'>
          {/* Single-branch: branch dropdown hidden
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className='px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white'
          >
            {!branches?.length && <option value=''>Loading branches...</option>}
            {branches?.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          */}

          <div className='relative flex-1 min-w-[200px]'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 pointer-events-none'
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(sanitizeSearch(e.target.value))}
              onKeyDown={e => {
                const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
                if (allowed.includes(e.key)) return
                if (e.ctrlKey || e.metaKey) return
                if (e.key.length === 1 && !/[A-Za-z0-9\s.\-]/.test(e.key)) e.preventDefault()
              }}
              onPaste={e => {
                e.preventDefault()
                const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
                setSearch(sanitizeSearch(pasted))
              }}
              onDrop={e => e.preventDefault()}
              placeholder='Search product...'
              autoComplete='off'
              className='w-full pl-9 pr-8 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
            />
            {search && (
              <button onClick={() => setSearch('')} className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                <X size={14} />
              </button>
            )}
          </div>

          <span className='font-sans text-xs text-neutral-400 ml-auto'>
            <span className='font-sans font-black text-neutral-700'>{filtered.length}</span> item{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>
          <div className='grid grid-cols-[0.3fr_2fr_1fr_1fr_1.2fr_1.8fr] bg-blue-50 border-b border-neutral-200'>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-3 py-3 border-r border-neutral-200 text-center'>No.</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-left'>Product</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Quantity</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Low Stock At</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Last Updated By</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 text-center'>Actions</span>
          </div>

          {loading ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {inventory.length === 0 ? 'There are currently no stocks' : 'No such product is available.'}
            </div>
          ) : (
            <div className='divide-y divide-neutral-200'>
              {filtered.map((item, index) => {
                const isLow = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold
                return (
                  <div key={item.productId ?? item.product?.id}
                    className='grid grid-cols-[0.3fr_2fr_1fr_1fr_1.2fr_1.8fr] items-center hover:bg-blue-50 transition-colors'>

                    {/* Number */}
                    <div className='px-3 py-4 border-r border-neutral-200 flex justify-center'>
                      <span className='font-sans font-bold text-sm text-neutral-500'>{index + 1}</span>
                    </div>

                    {/* Product */}
                    <div className='px-4 py-4 border-r border-neutral-200'>
                      <p className='font-sans font-semibold text-sm text-neutral-700 truncate'>{item.product?.name || '—'}</p>
                    </div>

                    {/* Quantity */}
                    <div className='px-4 py-4 border-r border-neutral-200 flex justify-center'>
                      <span className={`font-sans font-black text-sm ${isLow ? 'text-red-500' : 'text-blue-600'}`}>
                        {item.quantity}
                        {isLow && <span className='ml-1 text-[10px] uppercase tracking-widest font-bold text-red-400'>Low</span>}
                      </span>
                    </div>

                    {/* Low Stock At */}
                    <div className='px-4 py-4 border-r border-neutral-200 flex justify-center'>
                      <span className='font-sans text-sm text-neutral-500'>{item.lowStockThreshold ?? '—'}</span>
                    </div>

                    {/* Last Updated By */}
                    <div className='px-4 py-4 border-r border-neutral-200 flex justify-center'>
                      <span className='font-sans text-xs text-neutral-400 text-center'>
                        {item.lastUpdatedBy
                          ? (staffMap[item.lastUpdatedBy] || 'Unknown Staff')
                          : 'Super Admin'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className='flex items-center justify-center gap-3 px-4 py-4'>
                      <button onClick={() => openRestock(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap'>
                        Restock
                      </button>
                      <button onClick={() => openSet(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-blue-700 transition-colors whitespace-nowrap'>
                        Set Stock
                      </button>
                      <button onClick={() => handleRemove(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors whitespace-nowrap'>
                        Remove
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='bg-white w-full max-w-md' style={clipModal}>
            <div className='px-6 py-5' style={headerBg}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>
                    Operations
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {modal.mode === 'restock' ? 'Restock Product' : modal.item ? 'Set Stock' : 'Add Product Stock'}
                  </h2>
                </div>
                <button onClick={closeModal} className='text-blue-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>

              {!modal.item && (
                <label className='flex items-center gap-2 mb-1'>
                  <input
                    type='checkbox'
                    checked={showInactive}
                    onChange={e => setShowInactive(e.target.checked)}
                    className='accent-blue-600'
                  />
                  <span className='font-sans text-xs text-neutral-500'>Show inactive products</span>
                </label>
              )}

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                  Product <span className='text-red-400 normal-case'>*</span>
                </label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  disabled={!!modal.item}
                  className={`${inputCls('productId')} disabled:bg-neutral-50 disabled:text-neutral-400`}
                >
                  <option value=''>Choose a product...</option>
                  {(modal.item ? products : availableProducts).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{!p.isActive ? ' (Inactive)' : ''}
                    </option>
                  ))}
                </select>
                {errors.productId && <p className='font-sans text-[11px] text-red-500 mt-1'>{errors.productId}</p>}
              </div>

              {modal.mode === 'restock' ? (
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                    Add Quantity <span className='text-red-400 normal-case'>*</span>
                  </label>
                  <input
                    type='text'
                    inputMode='numeric'
                    value={addQuantity}
                    onKeyDown={makeIntKeyDownHandler(addQuantity)}
                    onChange={e => {
                      setAddQuantity(sanitizeInt(e.target.value))
                      if (errors.addQuantity) setErrors(prev => { const e = { ...prev }; delete e.addQuantity; return e })
                    }}
                    onPaste={makeIntPasteHandler(setAddQuantity)}
                    onDrop={e => e.preventDefault()}
                    placeholder='e.g. 10'
                    autoComplete='off'
                    className={inputCls('addQuantity')}
                  />
                  {errors.addQuantity && <p className='font-sans text-[11px] text-red-500 mt-1'>{errors.addQuantity}</p>}
                </div>
              ) : (
                <>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Quantity <span className='text-red-400 normal-case'>*</span>
                    </label>
                    <input
                      type='text'
                      inputMode='numeric'
                      value={quantity}
                      onKeyDown={makeIntKeyDownHandler(quantity)}
                      onChange={e => {
                        setQuantity(sanitizeInt(e.target.value))
                        if (errors.quantity) setErrors(prev => { const e = { ...prev }; delete e.quantity; return e })
                      }}
                      onPaste={makeIntPasteHandler(setQuantity)}
                      onDrop={e => e.preventDefault()}
                      placeholder='e.g. 20'
                      autoComplete='off'
                      className={inputCls('quantity')}
                    />
                    {errors.quantity && <p className='font-sans text-[11px] text-red-500 mt-1'>{errors.quantity}</p>}
                  </div>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Low Stock Threshold <span className='normal-case font-normal text-neutral-300'>(optional)</span>
                    </label>
                    <input
                      type='text'
                      inputMode='numeric'
                      value={lowStockThreshold}
                      onKeyDown={makeIntKeyDownHandler(lowStockThreshold)}
                      onChange={e => {
                        setLowStockThreshold(sanitizeInt(e.target.value))
                        if (errors.lowStockThreshold) setErrors(prev => { const e = { ...prev }; delete e.lowStockThreshold; return e })
                      }}
                      onPaste={makeIntPasteHandler(setLowStockThreshold)}
                      onDrop={e => e.preventDefault()}
                      placeholder='e.g. 5'
                      autoComplete='off'
                      className={inputCls('lowStockThreshold')}
                    />
                    {errors.lowStockThreshold && <p className='font-sans text-[11px] text-red-500 mt-1'>{errors.lowStockThreshold}</p>}
                  </div>
                </>
              )}

            </div>

            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={closeModal}
                className='flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-blue-50 transition-colors'>
                Cancel
              </button>
              <button
                onClick={modal.mode === 'restock' ? handleRestock : handleSetStock}
                disabled={submitting}
                className='flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-blue-700 transition-colors disabled:opacity-60'>
                {submitting ? 'Saving...' : modal.mode === 'restock' ? 'Restock' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminInventory