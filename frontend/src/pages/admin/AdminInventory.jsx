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

const AdminInventory = () => {
  const { aToken, backendUrl, branches, getAllBranches } = useContext(AdminContext)

  const [selectedBranch, setSelectedBranch] = useState('')
  const [inventory,      setInventory]      = useState([])
  const [products,       setProducts]       = useState([])
  const [loading,        setLoading]        = useState(false)
  const [search,         setSearch]         = useState('')
  const [staffMap,       setStaffMap]       = useState({})       // { staffId: "First Last" }
  const [showInactive,   setShowInactive]   = useState(false)

  // modal: { mode: 'set' | 'restock', item?: existing inventory row }
  const [modal,      setModal]      = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // form fields (modal)
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

  // Default to first branch once branches load
  useEffect(() => {
    if (!selectedBranch && branches?.length > 0) setSelectedBranch(branches[0].id)
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

  // ── Fetch staff list ng branch (para sa lastUpdatedBy names) ─────────────
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
      // silent fail — pangalan lang naman ito, hindi critical
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setProductId(''); setQuantity(''); setLowStockThreshold(''); setErrors({})
    setModal({ mode: 'set' })
    setShowInactive(false) // Reset toggle when opening Add modal
  }

  const openSet = (item) => {
    setProductId((item.productId ?? item.product?.id)?.toString())
    setQuantity(item.quantity)
    setLowStockThreshold(item.lowStockThreshold ?? '')
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

  // ── Submit: set stock ────────────────────────────────────────────────────
  const handleSetStock = async () => {
    const errs = {}
    if (!productId) errs.productId = 'Choose a product.'
    if (quantity === '' || isNaN(Number(quantity)) || Number(quantity) < 0)
      errs.quantity = 'Maglagay ng valid na quantity (0 o higit pa).'
    if (Object.keys(errs).length) return setErrors(errs)

    setSubmitting(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/inventory/set`,
        {
          branchId: selectedBranch,
          productId,
          quantity: Number(quantity),
          lowStockThreshold: lowStockThreshold === '' ? undefined : Number(lowStockThreshold),
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
    if (!addQuantity || isNaN(Number(addQuantity)) || Number(addQuantity) <= 0)
      errs.addQuantity = 'Maglagay ng valid na dagdag na quantity (higit sa 0).'
    if (Object.keys(errs).length) return setErrors(errs)

    setSubmitting(true)
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/inventory/restock`,
        { branchId: selectedBranch, productId, addQuantity: Number(addQuantity) },
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

  // ── Products na wala pa sa inventory ng napiling branch (para sa Add) ────
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

          <div className='relative flex-1 min-w-[200px]'>
            <svg className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-300 pointer-events-none'
              fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0' />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Search product...'
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
        <div className='bg-white border border-blue-100 overflow-hidden'>
          <div className='grid grid-cols-[2fr_1fr_1fr_1fr_1.8fr] bg-blue-50 px-7 py-3 border-b border-blue-100'>
            {['Product', 'Quantity', 'Low Stock At', 'Last Updated By', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-400'>{h}</span>
            ))}
          </div>

          {loading ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-300'>
              {inventory.length === 0 ? 'Wala pang stock records ang branch na ito.' : 'Walang product na tugma sa search.'}
            </div>
          ) : (
            <div className='divide-y divide-blue-50'>
              {filtered.map(item => {
                const isLow = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold
                return (
                  <div key={item.productId ?? item.product?.id}
                    className='grid grid-cols-[2fr_1fr_1fr_1fr_1.8fr] items-center px-7 py-4 hover:bg-blue-50 transition-colors'>

                    <p className='font-sans font-semibold text-sm text-neutral-700'>{item.product?.name || '—'}</p>

                    <span className={`font-sans font-black text-sm ${isLow ? 'text-red-500' : 'text-blue-600'}`}>
                      {item.quantity}
                      {isLow && <span className='ml-1 text-[10px] uppercase tracking-widest font-bold text-red-400'>Low</span>}
                    </span>

                    <span className='font-sans text-sm text-neutral-500'>{item.lowStockThreshold ?? '—'}</span>

                    <span className='font-sans text-xs text-neutral-400'>
                      {item.lastUpdatedBy
                        ? (staffMap[item.lastUpdatedBy] || 'Unknown Staff')
                        : 'Super Admin'}
                    </span>

                    <div className='flex items-center gap-3 flex-wrap'>
                      <button onClick={() => openRestock(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-blue-500 hover:text-blue-700 transition-colors'>
                        Restock
                      </button>
                      <button onClick={() => openSet(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 hover:text-blue-600 transition-colors'>
                        Set Stock
                      </button>
                      <button onClick={() => handleRemove(item)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-400 hover:text-red-600 transition-colors'>
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

              {/* Show Inactive Products toggle - only for Add mode */}
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

              {/* Product select — locked kung existing item na (set/restock) */}
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
                    type='number' min='1'
                    value={addQuantity}
                    onChange={e => setAddQuantity(e.target.value)}
                    placeholder='e.g. 10'
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
                      type='number' min='0'
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      placeholder='e.g. 20'
                      className={inputCls('quantity')}
                    />
                    {errors.quantity && <p className='font-sans text-[11px] text-red-500 mt-1'>{errors.quantity}</p>}
                  </div>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                      Low Stock Threshold <span className='normal-case font-normal text-neutral-300'>(optional)</span>
                    </label>
                    <input
                      type='number' min='0'
                      value={lowStockThreshold}
                      onChange={e => setLowStockThreshold(e.target.value)}
                      placeholder='e.g. 5'
                      className={inputCls('lowStockThreshold')}
                    />
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