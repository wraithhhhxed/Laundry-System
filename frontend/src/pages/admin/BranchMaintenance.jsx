import { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
  Search, UserCheck, UserX, Trash2, Pencil,
  X, Check, ChevronLeft, ChevronRight, Building2,
  AlertTriangle, KeyRound, Eye, EyeOff
} from 'lucide-react'

const DEFAULT_IMG = 'https://ui-avatars.com/api/?background=7c3aed&color=fff&name='
const inputCls    = 'w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white disabled:bg-neutral-50 disabled:text-neutral-400'
const errorCls    = 'font-sans text-[10px] text-red-400 uppercase tracking-widest mt-1'

const BranchMaintenance = () => {
  const { backendUrl, aToken, services, getAllServices } = useContext(AdminContext)
  const navigate = useNavigate()

  const [branches,     setBranches]     = useState([])
  const [total,        setTotal]        = useState(0)
  const [pages,        setPages]        = useState(1)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilter]       = useState('')
  const [loading,      setLoading]      = useState(false)

  const [editBranch,    setEditBranch]    = useState(null)
  const [editForm,      setEditForm]      = useState({})
  const [editLoading,   setEditLoading]   = useState(false)

  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [resetTarget,  setResetTarget]  = useState(null)
  const [newPassword,  setNewPassword]  = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => { if (!services.length) getAllServices() }, [])
  const activeServices = services.filter(s => s.isActive)

  // ── Auto-compute fee for edit modal ────────────────────────────
  const editComputedFee = (() => {
    if (!editForm.speciality?.length) return null
    const prices = editForm.speciality
      .map(n => activeServices.find(s => s.name === n)?.price)
      .filter(p => p !== undefined)
    return prices.length ? Math.min(...prices) : null
  })()

  const fetchBranches = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search)            params.search    = search
      if (filterStatus !== '') params.available = filterStatus
      const { data } = await axios.get(backendUrl + '/api/admin/branches', { headers: { token: aToken }, params })
      if (data.success) { setBranches(data.data.branches); setTotal(data.data.total); setPages(data.data.pages) }
      else toast.error(data.message)
    } catch { toast.error('Failed to load branches') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchBranches() }, [page, filterStatus])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchBranches() }

  const handleToggleStatus = async (branch) => {
    setTogglingId(branch._id)
    try {
      const { data } = await axios.patch(backendUrl + `/api/admin/branches/${branch._id}/toggle-status`, {}, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); fetchBranches() }
      else toast.error(data.message)
    } catch { toast.error('Failed to update status') }
    finally { setTogglingId(null) }
  }

  const openEdit = (branch) => {
    setEditBranch(branch)
    setEditForm({
      name:          branch.name,
      email:         branch.email,
      phone:         branch.phone || '',
      speciality:    branch.speciality || [],
      about:         branch.about || '',
      address_line1: branch.address?.line1 || '',
      address_line2: branch.address?.line2 || '',
    })
  }

  const toggleEditService = (serviceName) => {
    setEditForm(prev => ({
      ...prev,
      speciality: prev.speciality.includes(serviceName)
        ? prev.speciality.filter(s => s !== serviceName)
        : [...prev.speciality, serviceName]
    }))
  }

  const editPhoneInvalid = editForm.phone?.length > 0 && !/^09\d{9}$/.test(editForm.phone)

  const handleEditSave = async () => {
    if (editPhoneInvalid)          return toast.error('Phone must be 11 digits and start with 09.')
    if (!editForm.speciality.length) return toast.error('Select at least one service.')
    setEditLoading(true)
    try {
      const payload = {
        name:      editForm.name,
        email:     editForm.email,
        phone:     editForm.phone,
        speciality: editForm.speciality,
        about:     editForm.about,
        address:   { line1: editForm.address_line1, line2: editForm.address_line2 }
      }
      const { data } = await axios.put(backendUrl + `/api/admin/branches/${editBranch._id}`, payload, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); setEditBranch(null); fetchBranches() }
      else toast.error(data.message)
    } catch { toast.error('Failed to update branch') }
    finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/branches/${deleteTarget._id}`, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); setDeleteTarget(null); fetchBranches() }
      else toast.error(data.message)
    } catch { toast.error('Failed to delete branch') }
    finally { setDeleteLoading(false) }
  }

  const openReset = (branch) => { setResetTarget(branch); setNewPassword(''); setConfirmPass(''); setShowPass(false) }

  const handleResetPassword = async () => {
    if (newPassword.length < 8)     return toast.error('Password must be at least 8 characters')
    if (newPassword !== confirmPass) return toast.error('Passwords do not match')
    setResetLoading(true)
    try {
      const { data } = await axios.patch(backendUrl + `/api/admin/branches/${resetTarget._id}/reset-password`, { newPassword }, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); setResetTarget(null) }
      else toast.error(data.message)
    } catch { toast.error('Failed to reset password') }
    finally { setResetLoading(false) }
  }

  const activeCount   = branches.filter(b =>  b.available).length
  const inactiveCount = branches.filter(b => !b.available).length
  const passShort     = newPassword.length > 0 && newPassword.length < 8
  const passMismatch  = confirmPass.length > 0 && confirmPass !== newPassword
  const passMatch     = confirmPass.length > 0 && confirmPass === newPassword

  return (
    <div className='bg-neutral-50 min-h-screen' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>Branches & Users</p>
        <div className='flex items-center justify-between'>
          <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>Branch Maintenance</h1>
          <button onClick={() => navigate('/admin/add-branch')}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Branch</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Stat Cards */}
        <div className='grid grid-cols-3 gap-3 mb-8'>
          {[{ label: 'Total Branches', value: total }, { label: 'Active', value: activeCount }, { label: 'Inactive', value: inactiveCount }].map(({ label, value }) => (
            <div key={label} className='bg-violet-600 px-7 py-6'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #7c3aed' }}>
              <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-2'>{label}</p>
              <p className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '-0.03em' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className='bg-white border border-violet-100 px-5 py-4 mb-5 flex flex-wrap gap-3 items-center'>
          <form onSubmit={handleSearch} className='flex items-center gap-2 flex-1 min-w-[200px]'>
            <div className='relative flex-1'>
              <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300' />
              <input type='text' placeholder='Search by name or email...' value={search} onChange={(e) => setSearch(e.target.value)}
                className='w-full pl-9 pr-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white' />
            </div>
            <button type='submit'
              className='group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              <span className='relative z-10'>Search</span>
            </button>
          </form>
          <select value={filterStatus} onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            className='px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white'>
            <option value=''>All Status</option>
            <option value='true'>Active</option>
            <option value='false'>Inactive</option>
          </select>
          <span className='font-sans text-xs text-neutral-400 ml-auto'>
            <span className='font-sans font-black text-neutral-700'>{total}</span> branches
          </span>
        </div>

        {/* Table */}
        <div className='bg-white border border-violet-100 overflow-hidden'>
          {loading ? (
            <div className='flex justify-center items-center py-20 font-sans text-sm text-neutral-400'>Loading...</div>
          ) : branches.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-neutral-300'>
              <Building2 size={32} className='mb-2 opacity-40' />
              <p className='font-sans text-sm'>No branches found</p>
            </div>
          ) : (
            <div>
              <div className='grid grid-cols-[2fr_1fr_2fr_1fr_1fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
                {['Branch', 'Contact', 'Services', 'Starting At', 'Status', 'Actions'].map(h => (
                  <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>{h}</span>
                ))}
              </div>
              <div className='divide-y divide-violet-50'>
                {branches.map((branch) => (
                  <div key={branch._id} className='grid grid-cols-[2fr_1fr_2fr_1fr_1fr_auto] items-center px-7 py-4 hover:bg-violet-50 transition-colors'>
                    <div className='flex items-center gap-3'>
                      <img src={branch.image || `${DEFAULT_IMG}${encodeURIComponent(branch.name)}`} alt={branch.name}
                        className='w-9 h-9 object-cover flex-shrink-0'
                        onError={e => { e.target.src = `${DEFAULT_IMG}${encodeURIComponent(branch.name)}` }} />
                      <div>
                        <div className='font-sans font-semibold text-sm text-neutral-700'>{branch.name}</div>
                        <div className='font-sans text-xs text-neutral-400'>{branch.email}</div>
                      </div>
                    </div>
                    <div className='font-sans text-xs text-neutral-500'>{branch.phone || '—'}</div>
                    <div className='flex flex-wrap gap-1'>
                      {(branch.speciality || []).slice(0, 2).map(s => (
                        <span key={s} className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-violet-200 text-violet-500 px-2 py-0.5'>{s}</span>
                      ))}
                      {branch.speciality?.length > 2 && <span className='font-sans text-xs text-neutral-400'>+{branch.speciality.length - 2}</span>}
                    </div>
                    <div className='font-sans font-black text-sm text-violet-700'>₱{branch.fees?.toLocaleString() || '—'}</div>
                    <div>
                      {branch.available ? (
                        <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-green-200 text-green-600 px-2 py-1 inline-flex items-center gap-1'><Check size={9} /> Active</span>
                      ) : (
                        <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-red-200 text-red-500 px-2 py-1 inline-flex items-center gap-1'><X size={9} /> Inactive</span>
                      )}
                    </div>
                    <div className='flex items-center gap-1'>
                      <button onClick={() => openEdit(branch)} title='Edit' className='p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-colors'><Pencil size={14} /></button>
                      <button onClick={() => handleToggleStatus(branch)} disabled={togglingId === branch._id} title={branch.available ? 'Deactivate' : 'Activate'} className='p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40'>{branch.available ? <UserX size={14} /> : <UserCheck size={14} />}</button>
                      <button onClick={() => openReset(branch)} title='Reset Password' className='p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 transition-colors'><KeyRound size={14} /></button>
                      <button onClick={() => setDeleteTarget(branch)} title='Delete' className='p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors'><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pages > 1 && (
            <div className='flex items-center justify-between px-7 py-4 border-t border-violet-100'>
              <span className='font-sans text-xs text-neutral-400'>
                Page <span className='font-sans font-black text-neutral-700'>{page}</span> of <span className='font-sans font-black text-neutral-700'>{pages}</span> · {total} branches
              </span>
              <div className='flex gap-1'>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className='p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-30 transition-colors'><ChevronLeft size={16} /></button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i
                  if (p < 1 || p > pages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 font-sans text-xs font-bold transition-colors ${p === page ? 'bg-violet-600 text-white' : 'text-neutral-500 hover:bg-violet-50 hover:text-violet-600'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className='p-1.5 text-neutral-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-30 transition-colors'><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editBranch && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-0.5'>Branch Maintenance</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Edit Branch</h2>
                </div>
                <button onClick={() => setEditBranch(null)} className='text-violet-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <ModalField label='Branch Name' value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                <ModalField label='Email' type='email' value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>

              {/* Phone */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Phone</label>
                <input type='text' value={editForm.phone || ''}
                  onChange={e => { const v = e.target.value; if (/^[0-9]*$/.test(v) && v.length <= 11) setEditForm(p => ({ ...p, phone: v })) }}
                  className={inputCls + (editPhoneInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {editPhoneInvalid && <p className={errorCls}>Must be 11 digits starting with 09</p>}
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <ModalField label='Address Line 1' value={editForm.address_line1} onChange={e => setEditForm(p => ({ ...p, address_line1: e.target.value }))} />
                <ModalField label='Address Line 2' value={editForm.address_line2} onChange={e => setEditForm(p => ({ ...p, address_line2: e.target.value }))} />
              </div>

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>About</label>
                <textarea value={editForm.about || ''} onChange={e => setEditForm(p => ({ ...p, about: e.target.value }))} rows={3}
                  className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white resize-none' />
              </div>

              {/* Services toggle */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-2'>
                  Services Offered
                  {editForm.speciality?.length > 0 && <span className='ml-2 text-violet-600 normal-case tracking-normal font-bold'>{editForm.speciality.length} selected</span>}
                </label>
                <div className='flex flex-wrap gap-2 mb-3'>
                  {activeServices.map(service => {
                    const selected = editForm.speciality?.includes(service.name)
                    return (
                      <button key={service._id} type='button' onClick={() => toggleEditService(service.name)}
                        className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase font-bold border transition-colors ${
                          selected ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-neutral-400 border-violet-100 hover:border-violet-400 hover:text-violet-600'
                        }`}>
                        {selected && <span className='mr-1'>✓</span>}
                        {service.name}
                        <span className={`ml-1.5 text-[9px] ${selected ? 'text-violet-200' : 'text-neutral-300'}`}>₱{service.price}</span>
                      </button>
                    )
                  })}
                </div>
                {editForm.speciality?.length === 0 && <p className={errorCls}>Select at least one service</p>}

                {/* Starting fee preview */}
                {editComputedFee !== null && (
                  <div className='inline-flex items-center gap-3 px-4 py-2.5 bg-violet-50 border border-violet-200'>
                    <span className='font-sans text-[10px] text-violet-400 uppercase tracking-widest'>Starting at</span>
                    <span className='font-sans font-black text-violet-700 text-base' style={{ letterSpacing: '-0.02em' }}>₱{editComputedFee}</span>
                    <span className='font-sans text-[9px] text-neutral-400'>auto-computed</span>
                  </div>
                )}
              </div>
            </div>

            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setEditBranch(null)}
                className='group relative overflow-hidden flex-1 border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleEditSave} disabled={editLoading}
                className='group relative overflow-hidden flex-1 bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{editLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-sm' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-0.5'>Security</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Reset Password</h2>
                </div>
                <button onClick={() => setResetTarget(null)} className='text-violet-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>
            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-500 mb-5'>Setting new password for <span className='font-sans font-bold text-neutral-700'>{resetTarget.name}</span></p>
              <div className='space-y-4'>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>New Password</label>
                  <div className='relative'>
                    <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder='Min. 8 characters' className={inputCls + (passShort ? ' border-red-300 focus:border-red-400' : '')} />
                    <button type='button' onClick={() => setShowPass(p => !p)} className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-violet-400 transition-colors'>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passShort && <p className={errorCls}>Minimum 8 characters</p>}
                </div>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Confirm Password</label>
                  <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    className={inputCls + (passMismatch ? ' border-red-300 focus:border-red-400' : passMatch ? ' border-green-300 focus:border-green-400' : '')} />
                  {passMismatch && <p className={errorCls}>Passwords do not match</p>}
                  {passMatch    && <p className='font-sans text-[10px] text-green-500 uppercase tracking-widest mt-1'>Passwords match ✓</p>}
                </div>
              </div>
            </div>
            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setResetTarget(null)}
                className='group relative overflow-hidden flex-1 border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleResetPassword} disabled={resetLoading}
                className='group relative overflow-hidden flex-1 bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{resetLoading ? 'Resetting...' : 'Reset Password'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-sm' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-0.5'>Danger Zone</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Delete Branch</h2>
                </div>
                <button onClick={() => setDeleteTarget(null)} className='text-violet-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>
            <div className='px-6 py-6'>
              <div className='flex items-start gap-3'>
                <AlertTriangle size={18} className='text-red-400 mt-0.5 flex-shrink-0' />
                <p className='font-sans text-sm text-neutral-600'>
                  You're about to permanently delete <span className='font-sans font-bold text-neutral-800'>{deleteTarget.name}</span>. This cannot be undone.
                </p>
              </div>
            </div>
            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setDeleteTarget(null)}
                className='group relative overflow-hidden flex-1 border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className='group relative overflow-hidden flex-1 bg-red-500 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-red-700 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ModalField = ({ label, value, onChange, type = 'text', disabled = false }) => (
  <div>
    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>{label}</label>
    <input type={type} value={value || ''} onChange={onChange} disabled={disabled}
      className='w-full px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white disabled:bg-neutral-50 disabled:text-neutral-400' />
  </div>
)

export default BranchMaintenance