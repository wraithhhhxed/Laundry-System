import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'

const EMPTY_FORM = { label: '', description: '', price: '', active: true }

const PriceSettings = () => {
  const { getPrices, updatePrices } = useContext(AdminContext)

  const [prices, setPrices]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [showModal, setShowModal]   = useState(false)
  const [editIndex, setEditIndex]   = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formErr, setFormErr]       = useState({})

  const load = async () => {
    try {
      setLoading(true)
      const data = await getPrices()
      setPrices(data.filter(p => p !== null && p !== undefined))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditIndex(null)
    setForm(EMPTY_FORM)
    setFormErr({})
    setShowModal(true)
  }

  const openEdit = (i) => {
    setEditIndex(i)
    setForm({ label: prices[i].label, description: prices[i].description || '', price: String(prices[i].price), active: prices[i].active })
    setFormErr({})
    setShowModal(true)
  }

  const validate = () => {
    const err = {}
    if (!form.label.trim())              err.label = 'Label is required'
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0)
                                         err.price = 'Enter a valid price (0 or more)'
    setFormErr(err)
    return Object.keys(err).length === 0
  }

  const handleSaveModal = () => {
    if (!validate()) return
    const updated = [...prices]
    const entry = { ...form, price: Number(form.price), order: editIndex === null ? updated.length : updated[editIndex].order }
    if (editIndex === null) {
      updated.push(entry)
    } else {
      updated[editIndex] = { ...updated[editIndex], ...entry }
    }
    setPrices(updated)
    setShowModal(false)
  }

  const handleDelete = (i) => {
    setPrices(prev => prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, order: idx })))
  }

  const toggleActive = (i) => {
    setPrices(prev => prev.map((p, idx) => idx === i ? { ...p, active: !p.active } : p))
  }

  const moveUp = (i) => {
    if (i === 0) return
    setPrices(prev => {
      const arr = [...prev]
      ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
      return arr.map((p, idx) => ({ ...p, order: idx }))
    })
  }

  const moveDown = (i) => {
    if (i === prices.length - 1) return
    setPrices(prev => {
      const arr = [...prev]
      ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
      return arr.map((p, idx) => ({ ...p, order: idx }))
    })
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      await updatePrices(prices)
      toast.success('Prices saved successfully')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n) => `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  return (
    <div className='m-5 max-w-5xl'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-2xl font-bold text-gray-800'>Price Settings</h2>
          <p className='text-sm text-gray-500 mt-1'>Manage service prices shown on the homepage</p>
        </div>
        <div className='flex gap-3'>
          <button onClick={openAdd} className='flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90'>
            + Add Price
          </button>
          <button onClick={handleSaveAll} disabled={saving} className='bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className='text-gray-400 text-sm'>Loading…</p>
      ) : prices.length === 0 ? (
        <div className='text-center py-16 border-2 border-dashed border-gray-200 rounded-xl'>
          <p className='text-gray-400 text-sm'>No prices yet. Click <strong>+ Add Price</strong> to get started.</p>
        </div>
      ) : (
        <div className='border border-gray-200 rounded-xl overflow-hidden'>
          <div className='max-h-[60vh] overflow-y-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 sticky top-0 z-10'>
                <tr>
                  <th className='text-left px-4 py-3 text-gray-500 font-semibold w-8'>#</th>
                  <th className='text-left px-4 py-3 text-gray-500 font-semibold'>Service</th>
                  <th className='text-left px-4 py-3 text-gray-500 font-semibold w-28'>Price</th>
                  <th className='text-left px-4 py-3 text-gray-500 font-semibold w-24'>Status</th>
                  <th className='text-left px-4 py-3 text-gray-500 font-semibold w-32'>Order</th>
                  <th className='text-left px-4 py-3 text-gray-500 font-semibold w-28'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((item, i) => (
                  <tr key={i} className='border-t border-gray-100 hover:bg-gray-50'>
                    <td className='px-4 py-3 text-gray-400'>{i + 1}</td>
                    <td className='px-4 py-3'>
                      <p className='font-medium text-gray-700'>{item.label}</p>
                      {item.description && <p className='text-xs text-gray-400 mt-0.5'>{item.description}</p>}
                    </td>
                    <td className='px-4 py-3 font-semibold text-violet-700'>{fmt(item.price)}</td>
                    <td className='px-4 py-3'>
                      <button onClick={() => toggleActive(i)}
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {item.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex gap-1'>
                        <button onClick={() => moveUp(i)} disabled={i === 0} className='p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500 text-xs'>▲</button>
                        <button onClick={() => moveDown(i)} disabled={i === prices.length - 1} className='p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500 text-xs'>▼</button>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex gap-2'>
                        <button onClick={() => openEdit(i)} className='text-primary hover:underline text-xs font-medium'>Edit</button>
                        <button onClick={() => handleDelete(i)} className='text-red-400 hover:underline text-xs font-medium'>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl w-full max-w-md shadow-2xl'>
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100'>
              <h3 className='text-lg font-bold text-gray-800'>{editIndex === null ? 'Add Price Item' : 'Edit Price Item'}</h3>
              <button onClick={() => setShowModal(false)} className='text-gray-400 hover:text-gray-600 text-xl'>✕</button>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>Service Label <span className='text-red-400'>*</span></label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErr.label ? 'border-red-400' : 'border-gray-200'}`}
                  value={form.label}
                  onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder='e.g. Regular Wash'
                />
                {formErr.label && <p className='text-red-400 text-xs mt-1'>{formErr.label}</p>}
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>Description</label>
                <input
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder='e.g. Standard wash & dry (optional)'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1'>Price (₱) <span className='text-red-400'>*</span></label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${formErr.price ? 'border-red-400' : 'border-gray-200'}`}
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder='0.00'
                />
                {formErr.price && <p className='text-red-400 text-xs mt-1'>{formErr.price}</p>}
              </div>
              <div className='flex items-center gap-2'>
                <input type='checkbox' id='price-active' checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className='accent-primary' />
                <label htmlFor='price-active' className='text-sm text-gray-600'>Show on homepage</label>
              </div>
            </div>
            <div className='flex justify-end gap-3 px-6 py-4 border-t border-gray-100'>
              <button onClick={() => setShowModal(false)} className='px-4 py-2 text-sm text-gray-500 hover:text-gray-700'>Cancel</button>
              <button onClick={handleSaveModal} className='bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90'>
                {editIndex === null ? 'Add Price' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PriceSettings