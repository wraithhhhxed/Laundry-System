import { useContext, useEffect, useState, useMemo, useRef } from 'react'
import { BranchesContext } from '../../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const PAGE_SIZE = 4

const BranchInventory = () => {
  const { bToken, backendUrl } = useContext(BranchesContext)

  const [inventory,         setInventory]         = useState([])
  const [products,          setProducts]          = useState([])
  const [loading,           setLoading]           = useState(true)
  const [showForm,          setShowForm]          = useState(false)
  const [formMode,          setFormMode]          = useState('restock')
  const [selected,          setSelected]          = useState(null)
  const [submitting,        setSubmitting]        = useState(false)

  const [productId,         setProductId]         = useState('')
  const [quantity,          setQuantity]          = useState('')
  const [addQuantity,       setAddQuantity]       = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')

  // Filter + pagination state
  const [search,      setSearch]      = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(`${backendUrl}/api/inventory`, { headers: authHeader(bToken) })
      if (data.success) setInventory(data.data)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/products/active`)
      if (data.success) setProducts(data.data)
    } catch (err) {
      console.error('Failed to fetch products', err.message)
    }
  }

  useEffect(() => {
    if (bToken) { fetchInventory(); fetchProducts() }
  }, [bToken])

  useEffect(() => { setCurrentPage(1) }, [search, stockFilter])

  const openSetStock = () => {
    setFormMode('set')
    setSelected(null)
    setProductId('')
    setQuantity('')
    setLowStockThreshold('5')
    setShowForm(true)
  }

  const openRestock = (item) => {
    setFormMode('restock')
    setSelected(item)
    setAddQuantity('')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (formMode === 'set') {
        if (!productId || quantity === '') { toast.error('Product and quantity are required'); setSubmitting(false); return }
        const { data } = await axios.post(
          `${backendUrl}/api/inventory/set`,
          { productId, quantity: Number(quantity), lowStockThreshold: Number(lowStockThreshold) },
          { headers: authHeader(bToken) }
        )
        if (data.success) { toast.success('Stock set successfully'); setShowForm(false); fetchInventory() }
        else toast.error(data.message)
      } else {
        if (!addQuantity || Number(addQuantity) <= 0) { toast.error('Enter a valid restock quantity'); setSubmitting(false); return }
        const { data } = await axios.post(
          `${backendUrl}/api/inventory/restock`,
          { productId: selected.productId, addQuantity: Number(addQuantity) },
          { headers: authHeader(bToken) }
        )
        if (data.success) { toast.success('Restocked successfully'); setShowForm(false); fetchInventory() }
        else toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (item) => {
    const name = item.product?.name || 'this product'
    if (!window.confirm(`Remove ${name} from your branch inventory?`)) return
    try {
      const pid = item.productId
      const { data } = await axios.delete(`${backendUrl}/api/inventory/${pid}`, { headers: authHeader(bToken) })
      if (data.success) { toast.success('Removed from inventory'); fetchInventory() }
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const lowStockCount       = inventory.filter(i => i.quantity <= i.lowStockThreshold).length
  const inventoryProductIds = inventory
    .map(i => i.productId?.toString())
    .filter(Boolean)
  const availableToAdd      = products.filter(p => !inventoryProductIds.includes(p.id.toString()))

  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const isLow = item.quantity <= item.lowStockThreshold
      const isOut = item.quantity === 0

      if (stockFilter === 'out'      && !isOut)        return false
      if (stockFilter === 'low'      && (!isLow || isOut)) return false
      if (stockFilter === 'in_stock' && (isLow || isOut))  return false

      if (search.trim()) {
        const q    = search.toLowerCase()
        const name = item.product?.name?.toLowerCase()     || ''
        const cat  = item.product?.category?.toLowerCase() || ''
        if (!name.includes(q) && !cat.includes(q)) return false
      }

      return true
    })
  }, [inventory, search, stockFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const clearFilters = () => { setSearch(''); setStockFilter('all') }
  const hasFilters   = search || stockFilter !== 'all'

  const getPageRange = () => {
    const delta = 2
    const left  = Math.max(1, currentPage - delta)
    const right = Math.min(totalPages, currentPage + delta)
    const range = []
    for (let i = left; i <= right; i++) range.push(i)
    return range
  }

  const inputClass  = "w-full px-4 py-2.5 border border-neutral-300 font-sans text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors bg-white"
  const selectClass = "w-full px-4 py-2.5 border border-neutral-300 font-sans text-sm text-neutral-800 focus:outline-none focus:border-blue-500 transition-colors bg-white appearance-none cursor-pointer"

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Blue Panel Header */}
      <div
        className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #1d4ed8' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>
          Branch Portal
        </p>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <h1
              className='font-sans font-black text-white'
              style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
            >
              Inventory
            </h1>
            {lowStockCount > 0 && (
              <span className='inline-block border border-red-300 bg-red-50 text-red-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold'>
                {lowStockCount} Low Stock
              </span>
            )}
          </div>
          <button
            onClick={openSetStock}
            disabled={availableToAdd.length === 0}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Stock</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Search + Filter */}
        <div className='bg-white border border-blue-200 px-5 py-4 mb-4'>
          <div className='flex flex-col sm:flex-row gap-3'>
            {/* Search */}
            <div className='relative flex-1 min-w-[200px]'>
              <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none'
                fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0'/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Search product or category...'
                className='w-full pl-9 pr-8 py-2.5 border border-blue-200 font-sans text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors bg-white'
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-500 transition-colors'>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Stock status filter */}
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              className='px-4 py-2.5 border border-blue-200 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-500 transition-colors bg-white appearance-none cursor-pointer'
            >
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Count */}
        <div className='mb-4 flex items-center justify-between flex-wrap gap-2'>
          <p className='font-sans text-xs text-neutral-500'>
            Showing{' '}
            <span className='font-sans font-black text-neutral-700'>
              {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </span>
            {' '}of <span className='font-sans font-black text-neutral-700'>{filtered.length}</span> item{filtered.length !== 1 ? 's' : ''}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className='font-sans text-xs uppercase tracking-[0.2em] text-blue-600 hover:text-blue-800 transition-colors'>
              Clear Filters ×
            </button>
          )}
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>

          {/* Header */}
          <div className='grid grid-cols-[0.4fr_2fr_0.8fr_0.9fr_0.9fr_1.2fr] bg-blue-50 border-b border-neutral-200'>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>No.</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Product</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Quantity</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Low At</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Status</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3'>Actions</span>
          </div>

          {loading ? (
            <div className='py-16 flex items-center justify-center'>
              <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-400'>
              {inventory.length === 0
                ? 'No inventory yet. Click "+ Add Stock" to set up products for your branch.'
                : 'No items match your filters.'}
            </div>
          ) : (
            <div className='divide-y divide-neutral-200'>
              {paginated.map((item, index) => {
                const product = item.product
                const isLow   = item.quantity <= item.lowStockThreshold
                const isOut   = item.quantity === 0
                const rowNo   = (currentPage - 1) * PAGE_SIZE + index + 1

                return (
                  <div
                    key={item.id}
                    className='grid grid-cols-[0.4fr_2fr_0.8fr_0.9fr_0.9fr_1.2fr] items-center hover:bg-blue-50 transition-colors'
                  >
                    {/* Number */}
                    <span className='font-sans font-bold text-sm text-neutral-500 px-4 py-4 border-r border-neutral-200 text-center'>
                      {rowNo}
                    </span>

                    {/* Product */}
                    <div className='flex items-center gap-3 min-w-0 px-7 py-4 border-r border-neutral-200'>
                      {product?.image
                        ? <img src={product.image} className='w-9 h-9 object-cover flex-shrink-0' alt={product.name}/>
                        : <div className='w-9 h-9 bg-blue-100 flex items-center justify-center text-base font-bold text-blue-700 flex-shrink-0'>
                            {product?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                      }
                      <div className='min-w-0 overflow-hidden'>
                        <span className='font-sans font-semibold text-sm text-neutral-800 block truncate'>
                          {product?.name || '—'}
                        </span>
                        {product?.category && (
                          <span className='font-sans text-xs text-neutral-500 block truncate capitalize'>{product.category}</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <span className={`font-sans font-black text-sm px-7 py-4 border-r border-neutral-200 ${
                      isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-blue-700'
                    }`}>
                      {item.quantity}
                    </span>

                    {/* Threshold */}
                    <span className='font-sans font-bold text-sm text-neutral-500 px-7 py-4 border-r border-neutral-200'>
                      {item.lowStockThreshold}
                    </span>

                    {/* Status */}
                    <div className='px-7 py-4 border-r border-neutral-200'>
                      <span className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 w-fit inline-block ${
                        isOut
                          ? 'border-red-300 text-red-600 bg-red-50'
                          : isLow
                            ? 'border-amber-300 text-amber-600 bg-amber-50'
                            : 'border-green-300 text-green-700 bg-green-50'
                      }`}>
                        {isOut ? 'Out' : isLow ? 'Low' : 'In Stock'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className='flex items-center justify-start gap-4 px-7 py-4'>
                      <button onClick={() => openRestock(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-blue-600 hover:text-blue-800 transition-colors'>
                        Restock
                      </button>
                      <button onClick={() => handleRemove(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors'>
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className='mt-8 flex items-center justify-between flex-wrap gap-4'>
            <p className='font-sans text-xs text-neutral-500 uppercase tracking-[0.2em]'>
              Page <span className='font-sans font-black text-neutral-700'>{currentPage}</span> of {totalPages}
            </p>

            <div className='flex items-center gap-1'>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className='group relative overflow-hidden border border-blue-200 text-blue-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed'
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out' />
                <span className='relative z-10'>← Prev</span>
              </button>

              {getPageRange()[0] > 1 && (
                <>
                  <button onClick={() => setCurrentPage(1)}
                    className='group relative overflow-hidden border border-blue-200 text-blue-600 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9'>
                    <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out' />
                    <span className='relative z-10'>1</span>
                  </button>
                  {getPageRange()[0] > 2 && <span className='font-sans text-xs text-neutral-400 px-1'>…</span>}
                </>
              )}

              {getPageRange().map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`group relative overflow-hidden border font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9 transition-colors duration-200 ${
                    page === currentPage
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-blue-200 text-blue-600'
                  }`}
                >
                  {page !== currentPage && (
                    <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out' />
                  )}
                  <span className='relative z-10'>{page}</span>
                </button>
              ))}

              {getPageRange()[getPageRange().length - 1] < totalPages && (
                <>
                  {getPageRange()[getPageRange().length - 1] < totalPages - 1 && (
                    <span className='font-sans text-xs text-neutral-400 px-1'>…</span>
                  )}
                  <button onClick={() => setCurrentPage(totalPages)}
                    className='group relative overflow-hidden border border-blue-200 text-blue-600 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9'>
                    <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out' />
                    <span className='relative z-10'>{totalPages}</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className='group relative overflow-hidden border border-blue-200 text-blue-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed'
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out' />
                <span className='relative z-10'>Next →</span>
              </button>
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
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #1d4ed8' }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>
                    {formMode === 'set' ? 'Inventory' : 'Restock'}
                  </p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                    {formMode === 'set' ? 'Add Stock for Product' : `Restock: ${selected?.product?.name || ''}`}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-blue-200 hover:text-white transition-colors'>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-5'>
              {formMode === 'set' ? (
                <>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Product <span className='text-red-400 normal-case tracking-normal'>*</span>
                    </label>
                    <select value={productId} onChange={e => setProductId(e.target.value)} className={selectClass}>
                      <option value="">Select a product</option>
                      {availableToAdd.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Initial Quantity <span className='text-red-400 normal-case tracking-normal'>*</span>
                    </label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                      placeholder="e.g. 50" min="0" className={inputClass} />
                  </div>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Low Stock Alert Threshold
                    </label>
                    <input type="number" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)}
                      placeholder="e.g. 5" min="1" className={inputClass} />
                    <p className='font-sans text-xs text-neutral-400 mt-1.5'>Alert shows when quantity drops to or below this number</p>
                  </div>
                </>
              ) : (
                <>
                  <div className='border border-blue-200 px-5 py-3'>
                    <p className='uppercase tracking-[0.35em] text-[10px] text-blue-500 font-sans font-semibold mb-1'>Current Stock</p>
                    <p className='font-sans font-black text-blue-900 text-2xl' style={{ letterSpacing: '-0.03em' }}>
                      {selected?.quantity}
                    </p>
                  </div>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Add Quantity <span className='text-red-400 normal-case tracking-normal'>*</span>
                    </label>
                    <input type="number" value={addQuantity} onChange={e => setAddQuantity(e.target.value)}
                      placeholder="e.g. 20" min="1" className={inputClass} />
                    {addQuantity > 0 && (
                      <p className='font-sans text-xs text-neutral-400 mt-1.5'>
                        New total: <span className='font-bold text-blue-700'>{Number(selected?.quantity) + Number(addQuantity)}</span>
                      </p>
                    )}
                  </div>
                </>
              )}
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
                disabled={submitting}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-50'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>
                  {submitting ? 'Saving...' : formMode === 'set' ? 'Set Stock' : 'Restock'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchInventory