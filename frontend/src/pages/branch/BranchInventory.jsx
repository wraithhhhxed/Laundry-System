import { useContext, useEffect, useState, useMemo } from 'react'
import { BranchesContext } from '../../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const PAGE_SIZE = 4

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans mb-2 font-semibold">{children}</p>
)

const Divider = () => <div className="h-px bg-violet-100 mb-6" />

const StatusChip = ({ isOut, isLow }) => {
  if (isOut)
    return <span className="inline-block border border-red-300 bg-red-50 text-red-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold">Out of Stock</span>
  if (isLow)
    return <span className="inline-block border border-amber-300 bg-amber-50 text-amber-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold">Low Stock</span>
  return <span className="inline-block border border-green-300 bg-green-50 text-green-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold">In Stock</span>
}

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

  // Reset page on filter change
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
          { productId: selected.productId._id || selected.productId, addQuantity: Number(addQuantity) },
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
    const name = item.productId?.name || 'this product'
    if (!window.confirm(`Remove ${name} from your branch inventory?`)) return
    try {
      const pid = item.productId?._id || item.productId
      const { data } = await axios.delete(`${backendUrl}/api/inventory/${pid}`, { headers: authHeader(bToken) })
      if (data.success) { toast.success('Removed from inventory'); fetchInventory() }
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    }
  }

  const lowStockCount       = inventory.filter(i => i.quantity <= i.lowStockThreshold).length
  const inventoryProductIds = inventory
  .map(i => (i.productId?._id || i.productId)?.toString())
  .filter(Boolean)
  const availableToAdd      = products.filter(p => !inventoryProductIds.includes(p._id.toString()))

  // Filtered inventory
  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const isLow = item.quantity <= item.lowStockThreshold
      const isOut = item.quantity === 0

      if (stockFilter === 'out'      && !isOut)        return false
      if (stockFilter === 'low'      && (!isLow || isOut)) return false
      if (stockFilter === 'in_stock' && (isLow || isOut))  return false

      if (search.trim()) {
        const q    = search.toLowerCase()
        const name = item.productId?.name?.toLowerCase()     || ''
        const cat  = item.productId?.category?.toLowerCase() || ''
        if (!name.includes(q) && !cat.includes(q)) return false
      }

      return true
    })
  }, [inventory, search, stockFilter])

  // Pagination
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

  const inputClass  = "w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white"
  const selectClass = "w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white appearance-none cursor-pointer"

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-white">

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" style={{ fontFamily: "'Georgia', serif" }}>
          <div
            className="bg-white w-full max-w-md flex flex-col overflow-hidden"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            <div
              className="px-7 py-5"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
            >
              <SectionLabel>{formMode === 'set' ? 'Inventory' : 'Restock'}</SectionLabel>
              <h2 className="text-white font-sans font-black text-lg" style={{ letterSpacing: '-0.02em' }}>
                {formMode === 'set' ? 'Add Stock for Product' : `Restock: ${selected?.productId?.name || ''}`}
              </h2>
            </div>

            <div className="px-7 py-6 flex flex-col gap-5">
              {formMode === 'set' ? (
                <>
                  <div>
                    <SectionLabel>Product <span className="text-red-400 normal-case tracking-normal">*</span></SectionLabel>
                    <select value={productId} onChange={e => setProductId(e.target.value)} className={selectClass}>
                      <option value="">Select a product</option>
                      {availableToAdd.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <SectionLabel>Initial Quantity <span className="text-red-400 normal-case tracking-normal">*</span></SectionLabel>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                      placeholder="e.g. 50" min="0" className={inputClass} />
                  </div>
                  <div>
                    <SectionLabel>Low Stock Alert Threshold</SectionLabel>
                    <input type="number" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)}
                      placeholder="e.g. 5" min="1" className={inputClass} />
                    <p className="font-sans text-xs text-neutral-400 mt-1.5">Alert shows when quantity drops to or below this number</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="border border-violet-100 px-5 py-3">
                    <SectionLabel>Current Stock</SectionLabel>
                    <p className="font-sans font-black text-violet-900 text-2xl" style={{ letterSpacing: '-0.03em' }}>
                      {selected?.quantity}
                    </p>
                  </div>
                  <div>
                    <SectionLabel>Add Quantity <span className="text-red-400 normal-case tracking-normal">*</span></SectionLabel>
                    <input type="number" value={addQuantity} onChange={e => setAddQuantity(e.target.value)}
                      placeholder="e.g. 20" min="1" className={inputClass} />
                    {addQuantity > 0 && (
                      <p className="font-sans text-xs text-neutral-400 mt-1.5">
                        New total: <span className="font-bold text-violet-700">{Number(selected?.quantity) + Number(addQuantity)}</span>
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-6 py-2.5 disabled:opacity-50"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">{submitting ? 'Saving...' : formMode === 'set' ? 'Set Stock' : 'Restock'}</span>
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="group relative overflow-hidden border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-6 py-2.5"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div
        className="px-10 pt-10 pb-12"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-3 font-semibold">Branch Portal</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-1">
              <h1
                className="text-white font-sans font-black"
                style={{ letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}
              >
                Inventory
              </h1>
              {lowStockCount > 0 && (
                <span className="inline-block border border-red-300 bg-red-50 text-red-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold">
                  {lowStockCount} Low Stock
                </span>
              )}
            </div>
            <p className="font-sans text-sm text-violet-200 mt-2">Manage product stock levels for your branch</p>
          </div>

          <button
            onClick={openSetStock}
            disabled={availableToAdd.length === 0}
            className="group relative overflow-hidden bg-white text-violet-700 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            <span className="relative">+ Add Stock</span>
          </button>
        </div>
      </div>

      <div className="px-10 py-10 max-w-7xl mx-auto">

        {/* Search + Filter */}
        <SectionLabel>Filter Inventory</SectionLabel>
        <Divider />

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product or category..."
              className="w-full pl-10 pr-8 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500 text-lg leading-none">
                ×
              </button>
            )}
          </div>

          {/* Stock status filter */}
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white appearance-none cursor-pointer"
          >
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="font-sans text-xs text-neutral-400">
            Showing{' '}
            <span className="text-violet-600 font-semibold">
              {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="text-violet-600 font-semibold">{filtered.length}</span> item{filtered.length !== 1 ? 's' : ''}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="font-sans text-xs uppercase tracking-[0.2em] text-violet-400 hover:text-violet-600 transition-colors">
              Clear Filters ×
            </button>
          )}
        </div>

        {/* Table head */}
        <div className="grid grid-cols-5 pb-3 border-b border-violet-100">
          {['Product', 'Quantity', 'Low Stock At', 'Status', 'Actions'].map((h, i) => (
            <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i === 4 ? 'text-right' : ''}`}>{h}</p>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="font-sans text-xs uppercase tracking-widest text-neutral-300 font-semibold">
              {inventory.length === 0 ? 'No inventory yet' : 'No items match your filters'}
            </p>
            {inventory.length === 0
              ? <p className="font-sans text-xs text-neutral-300">Click "Add Stock" to set up products for your branch</p>
              : <button onClick={clearFilters} className="font-sans text-xs uppercase tracking-[0.2em] text-violet-400 hover:text-violet-600 transition-colors">Clear Filters →</button>
            }
          </div>
        )}

        <div className="divide-y divide-violet-50">
          {!loading && paginated.map(item => {
            const product = item.productId
            const isLow   = item.quantity <= item.lowStockThreshold
            const isOut   = item.quantity === 0

            return (
              <div
                key={item._id}
                className={`grid grid-cols-5 items-center py-4 -mx-10 px-10 transition-colors ${isLow ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-violet-50'}`}
              >
                {/* Product */}
                <div className="flex items-center gap-3">
                  {product?.image
                    ? <img src={product.image} alt={product.name} className="w-9 h-9 object-cover flex-shrink-0 border border-violet-100" />
                    : (
                      <div className="w-9 h-9 bg-violet-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-black font-sans">
                          {product?.name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )
                  }
                  <div>
                    <p className="font-sans text-sm font-bold text-neutral-800">{product?.name || '—'}</p>
                    <p className="font-sans text-xs text-neutral-400 capitalize font-medium">{product?.category || ''}</p>
                  </div>
                </div>

                {/* Quantity */}
                <p className={`font-sans font-black text-xl ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-violet-900'}`}
                  style={{ letterSpacing: '-0.03em' }}>
                  {item.quantity}
                </p>

                {/* Threshold */}
                <p className="font-sans text-sm font-semibold text-neutral-500">{item.lowStockThreshold}</p>

                {/* Status */}
                <StatusChip isOut={isOut} isLow={isLow} />

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                  <button
                    onClick={() => openRestock(item)}
                    className="font-sans text-xs uppercase tracking-[0.2em] font-bold text-violet-500 hover:text-violet-700 transition-colors"
                  >
                    Restock
                  </button>
                  <button
                    onClick={() => handleRemove(item)}
                    className="font-sans text-xs uppercase tracking-[0.2em] font-bold text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
            <p className="font-sans text-xs text-neutral-400 uppercase tracking-[0.2em]">
              Page <span className="text-violet-600 font-semibold">{currentPage}</span> of {totalPages}
            </p>

            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                <span className="relative">← Prev</span>
              </button>

              {/* First + ellipsis */}
              {getPageRange()[0] > 1 && (
                <>
                  <button onClick={() => setCurrentPage(1)}
                    className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9">
                    <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                    <span className="relative">1</span>
                  </button>
                  {getPageRange()[0] > 2 && <span className="font-sans text-xs text-neutral-300 px-1">…</span>}
                </>
              )}

              {/* Page range */}
              {getPageRange().map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`group relative overflow-hidden border font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9 transition-colors duration-200 ${
                    page === currentPage
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-violet-100 text-violet-400'
                  }`}
                >
                  {page !== currentPage && (
                    <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                  )}
                  <span className="relative">{page}</span>
                </button>
              ))}

              {/* Last + ellipsis */}
              {getPageRange()[getPageRange().length - 1] < totalPages && (
                <>
                  {getPageRange()[getPageRange().length - 1] < totalPages - 1 && (
                    <span className="font-sans text-xs text-neutral-300 px-1">…</span>
                  )}
                  <button onClick={() => setCurrentPage(totalPages)}
                    className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9">
                    <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                    <span className="relative">{totalPages}</span>
                  </button>
                </>
              )}

              {/* Next */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                <span className="relative">Next →</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default BranchInventory