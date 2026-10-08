import { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import {
  UserPlus, Search, UserCheck, UserX, Trash2, Pencil,
  X, Check, ChevronLeft, ChevronRight, Users, AlertTriangle,
  KeyRound, Eye, EyeOff
} from 'lucide-react'

const DEFAULT_IMG = 'https://ui-avatars.com/api/?background=2563eb&color=fff&name='
const inputCls    = 'w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
const errorCls    = 'font-sans text-[10px] text-red-400 uppercase tracking-widest mt-1'

// ─── Sanitizers ──────────────────────────────────────────────────────
const sanitizeName = (v) =>
  String(v || '').replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ')

const sanitizeEmail = (v) =>
  String(v || '').replace(/[^A-Za-z0-9@._+-]/g, '').toLowerCase()

const sanitizePhone = (v) =>
  String(v || '').replace(/[^0-9]/g, '').slice(0, 11)

const sanitizeAddress = (v) =>
  String(v || '').replace(/[^A-Za-z0-9\s,.#\-]/g, '').replace(/\s+/g, ' ')

// ─── Password validators ─────────────────────────────────────────────
const pwHasUpper   = (pw) => /[A-Z]/.test(pw)
const pwHasLower   = (pw) => /[a-z]/.test(pw)
const pwHasNumber  = (pw) => /[0-9]/.test(pw)
const pwHasSpecial = (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pw)
const pwIsValid    = (pw) =>
  pw.length >= 8 && pwHasUpper(pw) && pwHasLower(pw) && pwHasNumber(pw) && pwHasSpecial(pw)

// ─── Keydown factories ───────────────────────────────────────────────
const makeNameKeyDown = (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z\s]/.test(e.key)) e.preventDefault()
}

const makeEmailKeyDown = (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9@._+-]/.test(e.key)) e.preventDefault()
}

const makePhoneKeyDown = (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault()
}

const makeAddressKeyDown = (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9\s,.#\-]/.test(e.key)) e.preventDefault()
}

// ─── Reusable paste handler ──────────────────────────────────────────
const makePasteHandler = (sanitize, setter) => (e) => {
  e.preventDefault()
  const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
  setter(sanitize(pasted))
}

// ─── ModalField component with validation props ──────────────────────
const ModalField = ({ label, value, onChange, onKeyDown, onPaste, type = 'text', placeholder = '', error, hint }) => (
  <div>
    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
      {label}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onDrop={e => e.preventDefault()}
      placeholder={placeholder}
      autoComplete='off'
      className={inputCls + (error ? ' border-red-300 focus:border-red-400' : '')}
    />
    {error && <p className={errorCls}>{error}</p>}
    {!error && hint && <p className='font-sans text-[10px] text-neutral-400 mt-1'>{hint}</p>}
  </div>
)

const UserMaintenance = () => {
  const { backendUrl, aToken } = useContext(AdminContext)

  const [users,         setUsers]         = useState([])
  const [total,         setTotal]         = useState(0)
  const [pages,         setPages]         = useState(1)
  const [page,          setPage]          = useState(1)
  const [search,        setSearch]        = useState('')
  const [filterActive,  setFilterActive]  = useState('')
  const [loading,       setLoading]       = useState(false)

  const [showAddModal,  setShowAddModal]  = useState(false)
  const [addForm,       setAddForm]       = useState({ name: '', email: '', phone: '', password: '', address: '' })
  const [addImg,        setAddImg]        = useState(null)
  const [showAddPass,   setShowAddPass]   = useState(false)
  const [addLoading,    setAddLoading]    = useState(false)

  const [editUser,      setEditUser]      = useState(null)
  const [editForm,      setEditForm]      = useState({})
  const [editLoading,   setEditLoading]   = useState(false)

  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [resetTarget,   setResetTarget]   = useState(null)
  const [newPassword,   setNewPassword]   = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [showPass,      setShowPass]      = useState(false)
  const [resetLoading,  setResetLoading]  = useState(false)

  const addNameInvalid   = addForm.name.length > 0 && !/^[A-Za-z\s]{2,}$/.test(addForm.name.trim())
  const addEmailInvalid  = addForm.email.length > 0 && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(addForm.email)
  const addPhoneInvalid  = addForm.phone.length > 0 && !/^09\d{9}$/.test(addForm.phone)
  const addPassShort     = addForm.password.length > 0 && !pwIsValid(addForm.password)

  const editNameInvalid  = editForm.name && !/^[A-Za-z\s]{2,}$/.test(editForm.name.trim())
  const editEmailInvalid = editForm.email && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(editForm.email)

  const passShort       = newPassword.length > 0 && !pwIsValid(newPassword)
  const passMismatch    = confirmPass.length > 0 && confirmPass !== newPassword
  const passMatch       = confirmPass.length > 0 && confirmPass === newPassword
  const activeCount     = users.filter(u => u.isActive !== false).length
  const inactiveCount   = users.filter(u => u.isActive === false).length

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search)              params.search   = search
      if (filterActive !== '') params.isActive = filterActive
      const { data } = await axios.get(backendUrl + '/api/admin/users', {
        headers: { token: aToken }, params
      })
      if (data.success) {
        setUsers(data.data.users)
        setTotal(data.data.total)
        setPages(data.data.pages)
      } else toast.error(data.message)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [page, filterActive])

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers() }

  const openAdd = () => {
    setAddForm({ name: '', email: '', phone: '', password: '', address: '' })
    setAddImg(null); setShowAddPass(false); setShowAddModal(true)
  }

  const handleAddUser = async () => {
    if (!addForm.name.trim())                     return toast.error('Name is required')
    if (!/^[A-Za-z\s]{2,}$/.test(addForm.name.trim())) return toast.error('Name can only contain letters and spaces')
    if (!addForm.email.trim())                    return toast.error('Email is required')
    if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(addForm.email))
                                                  return toast.error('Please enter a valid email address')
    if (addPhoneInvalid)                          return toast.error('Phone must be 11 digits starting with 09')
    if (!pwIsValid(addForm.password))             return toast.error('Password must be 8+ chars with uppercase, lowercase, number, and special character')
    setAddLoading(true)
    try {
      const formData = new FormData()
      formData.append('name',     addForm.name)
      formData.append('email',    addForm.email)
      formData.append('phone',    addForm.phone)
      formData.append('password', addForm.password)
      if (addForm.address) formData.append('address', addForm.address)
      if (addImg)          formData.append('image',   addImg)
      const { data } = await axios.post(backendUrl + '/api/admin/users', formData, {
        headers: { token: aToken }
      })
      if (data.success) { toast.success(data.message); setShowAddModal(false); fetchUsers() }
      else toast.error(data.message)
    } catch { toast.error('Failed to create user') }
    finally { setAddLoading(false) }
  }

  const handleToggleStatus = async (user) => {
    try {
      const { data } = await axios.patch(
        backendUrl + `/api/admin/users/${user.id}/status`,
        { isActive: !user.isActive },
        { headers: { token: aToken } }
      )
      if (data.success) { toast.success(data.message); fetchUsers() }
      else toast.error(data.message)
    } catch { toast.error('Failed to update status') }
  }

  const addressToText = (addr) => {
    if (!addr) return ''
    if (typeof addr === 'string') return addr
    return [addr.line1, addr.line2].filter(Boolean).join(', ')
  }

  const openEdit = (user) => {
    setEditUser(user)
    setEditForm({
      name: sanitizeName(user.name),
      email: sanitizeEmail(user.email),
      phone: sanitizePhone(user.phone || ''),
      address: sanitizeAddress(addressToText(user.address)),
    })
  }

  const handleEditSave = async () => {
    if (editForm.name && !/^[A-Za-z\s]{2,}$/.test(editForm.name.trim()))
      return toast.error('Name can only contain letters and spaces')
    if (editForm.email && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(editForm.email))
      return toast.error('Please enter a valid email address')
    if (editForm.phone && !/^09\d{9}$/.test(editForm.phone))
      return toast.error('Phone must be 11 digits starting with 09')

    setEditLoading(true)
    try {
      const { data } = await axios.put(
        backendUrl + `/api/admin/users/${editUser.id}`,
        editForm,
        { headers: { token: aToken } }
      )
      if (data.success) { toast.success(data.message); setEditUser(null); fetchUsers() }
      else toast.error(data.message)
    } catch { toast.error('Failed to update user') }
    finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/admin/users/${deleteTarget.id}`,
        { headers: { token: aToken } }
      )
      if (data.success) { toast.success(data.message); setDeleteTarget(null); fetchUsers() }
      else toast.error(data.message)
    } catch { toast.error('Failed to delete user') }
    finally { setDeleteLoading(false) }
  }

  const openReset = (user) => {
    setResetTarget(user); setNewPassword(''); setConfirmPass(''); setShowPass(false)
  }

  const handleResetPassword = async () => {
    if (!pwIsValid(newPassword))
      return toast.error('Password must be 8+ chars with uppercase, lowercase, number, and special character')
    if (newPassword !== confirmPass) return toast.error('Passwords do not match')
    setResetLoading(true)
    try {
      const { data } = await axios.patch(
        backendUrl + `/api/admin/users/${resetTarget.id}/reset-password`,
        { newPassword },
        { headers: { token: aToken } }
      )
      if (data.success) { toast.success(data.message); setResetTarget(null) }
      else toast.error(data.message)
    } catch { toast.error('Failed to reset password') }
    finally { setResetLoading(false) }
  }

  // ─── Grid template — FIXED pixel width para sa No. column ──────────────
  const GRID = 'grid grid-cols-[50px_2fr_1fr_1fr_1.8fr]'

  return (
    <div className='bg-neutral-50 min-h-screen' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div className='px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
                <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>Maintenance</p>
        <div className='flex items-center justify-between'>
          <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>
            User Maintenance
          </h1>
          <button onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <UserPlus size={13} className='relative z-10' />
            <span className='relative z-10'>Add User</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Stat Cards */}
        <div className='grid grid-cols-3 gap-3 mb-8'>
          {[
            { label: 'Total Users', value: total },
            { label: 'Active',      value: activeCount },
            { label: 'Inactive',    value: inactiveCount },
          ].map(({ label, value }) => (
            <div key={label} className='px-7 py-6'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #2563eb' }}>
              <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-2'>{label}</p>
              <p className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '-0.03em' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className='bg-white border border-blue-100 px-5 py-4 mb-5 flex flex-wrap gap-3 items-center'>
          <form onSubmit={handleSearch} className='flex items-center gap-2 flex-1 min-w-[200px]'>
            <div className='relative flex-1'>
              <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300' />
              <input type='text' placeholder='Search by name, email, or phone...' value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={makeAddressKeyDown}
                onPaste={makePasteHandler(sanitizeAddress, setSearch)}
                onDrop={e => e.preventDefault()}
                autoComplete='off'
                className='w-full pl-9 pr-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white' />
            </div>
            <button type='submit'
              className='group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              <span className='relative z-10'>Search</span>
            </button>
          </form>
          <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1) }}
            className='px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white'>
            <option value=''>All Status</option>
            <option value='true'>Active</option>
            <option value='false'>Inactive</option>
          </select>
          <span className='font-sans text-xs text-neutral-400 ml-auto'>
            <span className='font-sans font-black text-neutral-700'>{total}</span> users
          </span>
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>
          {loading ? (
            <div className='flex justify-center items-center py-20 font-sans text-sm text-neutral-400'>Loading...</div>
          ) : users.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-neutral-300'>
              <Users size={32} className='mb-2 opacity-40' />
              <p className='font-sans text-sm'>No users found</p>
            </div>
          ) : (
            <div>
              {/* Header — Fixed 50px No. column */}
              <div className={`${GRID} bg-blue-50 border-b border-neutral-200`}>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 py-3 border-r border-neutral-200 text-center'>No.</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-left'>User</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Phone</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Status</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 text-center'>Actions</span>
              </div>
              <div className='divide-y divide-neutral-200'>
                {users.map((user, index) => (
                  <div key={user.id} className={`${GRID} items-stretch hover:bg-blue-50 transition-colors`}>

                    {/* Number */}
                    <div className='flex items-center justify-center py-5 border-r border-neutral-200'>
                      <span className='font-sans font-bold text-sm text-neutral-500'>{index + 1}</span>
                    </div>

                    {/* User */}
                    <div className='flex items-center gap-3 px-4 py-5 border-r border-neutral-200'>
                      <img src={user.image || `${DEFAULT_IMG}${encodeURIComponent(user.name)}`} alt={user.name}
                        className='w-9 h-9 object-cover flex-shrink-0'
                        onError={e => { e.target.src = `${DEFAULT_IMG}${encodeURIComponent(user.name)}` }} />
                      <div className='min-w-0'>
                        <p className='font-sans font-semibold text-sm text-neutral-700 truncate'>{user.name}</p>
                        <p className='font-sans text-xs text-neutral-400 truncate'>{user.email}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className='flex items-center justify-center px-4 py-5 border-r border-neutral-200'>
                      <span className='font-sans text-xs text-neutral-500'>{user.phone || '—'}</span>
                    </div>

                    {/* Status */}
                    <div className='flex items-center justify-center px-4 py-5 border-r border-neutral-200'>
                      {user.isActive !== false ? (
                        <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-green-200 text-green-600 px-2 py-1 inline-flex items-center gap-1 whitespace-nowrap'><Check size={9} /> Active</span>
                      ) : (
                        <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-red-200 text-red-500 px-2 py-1 inline-flex items-center gap-1 whitespace-nowrap'><X size={9} /> Inactive</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className='flex items-center justify-center gap-1 px-4 py-5'>
                      <button onClick={() => openEdit(user)} title='Edit' className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'><Pencil size={14} /></button>
                      <button onClick={() => handleToggleStatus(user)} title={user.isActive !== false ? 'Deactivate' : 'Activate'} className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'>
                        {user.isActive !== false ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button onClick={() => openReset(user)} title='Reset Password' className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'><KeyRound size={14} /></button>
                      <button onClick={() => setDeleteTarget(user)} title='Delete' className='p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors'><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pages > 1 && (
            <div className='flex items-center justify-between px-7 py-4 border-t border-neutral-200'>
              <span className='font-sans text-xs text-neutral-400'>
                Page <span className='font-sans font-black text-neutral-700'>{page}</span> of <span className='font-sans font-black text-neutral-700'>{pages}</span> · {total} users
              </span>
              <div className='flex gap-1'>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors'><ChevronLeft size={16} /></button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i
                  if (p < 1 || p > pages) return null
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 font-sans text-xs font-bold transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors'><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-md max-h-[90vh] overflow-y-auto'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>User Maintenance</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Add User</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>
            <div className='px-6 py-6 space-y-4'>

              {/* Profile Photo */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-2'>
                  Profile Photo <span className='normal-case tracking-normal font-normal text-neutral-300'>(optional)</span>
                </label>
                <label htmlFor='add-user-img' className='cursor-pointer inline-block'>
                  <div className='w-20 h-20 border border-blue-100 overflow-hidden flex items-center justify-center bg-neutral-50 hover:border-blue-400 transition-colors'>
                    {addImg ? (
                      <img src={URL.createObjectURL(addImg)} alt='' className='w-full h-full object-cover' />
                    ) : (
                      <span className='font-sans text-[10px] text-neutral-300 uppercase tracking-widest text-center leading-tight px-1'>Upload Photo</span>
                    )}
                  </div>
                </label>
                <input type='file' id='add-user-img' hidden accept='image/*' onChange={e => setAddImg(e.target.files[0])} />
              </div>

              {/* Name + Email */}
              <div className='grid grid-cols-2 gap-4'>
                <ModalField
                  label='Full Name'
                  value={addForm.name}
                  placeholder='Juan Dela Cruz'
                  error={addNameInvalid ? 'Letters and spaces only' : ''}
                  onKeyDown={makeNameKeyDown}
                  onPaste={makePasteHandler(sanitizeName, v => setAddForm(p => ({ ...p, name: v })))}
                  onChange={e => setAddForm(p => ({ ...p, name: sanitizeName(e.target.value) }))}
                />
                <ModalField
                  label='Email'
                  type='email'
                  value={addForm.email}
                  placeholder='juan@email.com'
                  error={addEmailInvalid ? 'Invalid email format' : ''}
                  onKeyDown={makeEmailKeyDown}
                  onPaste={makePasteHandler(sanitizeEmail, v => setAddForm(p => ({ ...p, email: v })))}
                  onChange={e => setAddForm(p => ({ ...p, email: sanitizeEmail(e.target.value) }))}
                />
              </div>

              {/* Phone */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Phone</label>
                <input type='text' value={addForm.phone} placeholder='09123456789'
                  onKeyDown={makePhoneKeyDown}
                  onPaste={makePasteHandler(sanitizePhone, v => setAddForm(p => ({ ...p, phone: v })))}
                  onDrop={e => e.preventDefault()}
                  onChange={e => setAddForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))}
                  autoComplete='off'
                  className={inputCls + (addPhoneInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {addPhoneInvalid && <p className={errorCls}>Must be 11 digits starting with 09</p>}
              </div>

              {/* Password */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Password</label>
                <div className='relative'>
                  <input type={showAddPass ? 'text' : 'password'} value={addForm.password} placeholder='Min. 8 chars with A-a-1-!'
                    onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
                    onDrop={e => e.preventDefault()}
                    autoComplete='new-password'
                    className={inputCls + ' pr-10' + (addPassShort ? ' border-red-300 focus:border-red-400' : '')} />
                  <button type='button' onClick={() => setShowAddPass(p => !p)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                    {showAddPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {addPassShort && <p className={errorCls}>Must have 8+ chars, uppercase, lowercase, number, special</p>}
                {!addPassShort && addForm.password.length === 0 && (
                  <p className='font-sans text-[10px] text-neutral-400 mt-1'>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>
                  Address <span className='normal-case tracking-normal font-normal text-neutral-300'>(optional)</span>
                </label>
                <input type='text' value={addForm.address} placeholder='Street, Barangay, City'
                  onKeyDown={makeAddressKeyDown}
                  onPaste={makePasteHandler(sanitizeAddress, v => setAddForm(p => ({ ...p, address: v })))}
                  onDrop={e => e.preventDefault()}
                  onChange={e => setAddForm(p => ({ ...p, address: sanitizeAddress(e.target.value) }))}
                  autoComplete='off'
                  className={inputCls} />
              </div>

            </div>
            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setShowAddModal(false)}
                className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleAddUser} disabled={addLoading}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{addLoading ? 'Creating...' : 'Create User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editUser && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-md' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>User Maintenance</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Edit User</h2>
                </div>
                <button onClick={() => setEditUser(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>
            <div className='px-6 py-6 space-y-4'>
              <ModalField
                label='Full Name'
                value={editForm.name}
                error={editNameInvalid ? 'Letters and spaces only' : ''}
                onKeyDown={makeNameKeyDown}
                onPaste={makePasteHandler(sanitizeName, v => setEditForm(p => ({ ...p, name: v })))}
                onChange={e => setEditForm(p => ({ ...p, name: sanitizeName(e.target.value) }))}
              />
              <ModalField
                label='Email'
                type='email'
                value={editForm.email}
                error={editEmailInvalid ? 'Invalid email format' : ''}
                onKeyDown={makeEmailKeyDown}
                onPaste={makePasteHandler(sanitizeEmail, v => setEditForm(p => ({ ...p, email: v })))}
                onChange={e => setEditForm(p => ({ ...p, email: sanitizeEmail(e.target.value) }))}
              />
              <ModalField
                label='Phone'
                value={editForm.phone}
                onKeyDown={makePhoneKeyDown}
                onPaste={makePasteHandler(sanitizePhone, v => setEditForm(p => ({ ...p, phone: v })))}
                onChange={e => setEditForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))}
              />
              <ModalField
                label='Address'
                value={editForm.address}
                onKeyDown={makeAddressKeyDown}
                onPaste={makePasteHandler(sanitizeAddress, v => setEditForm(p => ({ ...p, address: v })))}
                onChange={e => setEditForm(p => ({ ...p, address: sanitizeAddress(e.target.value) }))}
              />
            </div>
            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setEditUser(null)}
                className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleEditSave} disabled={editLoading}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
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
            <div className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Security</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Reset Password</h2>
                </div>
                <button onClick={() => setResetTarget(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>
            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-500 mb-5'>
                Setting new password for <span className='font-sans font-bold text-neutral-700'>{resetTarget.name}</span>
              </p>
              <div className='space-y-4'>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>New Password</label>
                  <div className='relative'>
                    <input type={showPass ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onDrop={e => e.preventDefault()}
                      placeholder='Min. 8 chars with A-a-1-!'
                      autoComplete='new-password'
                      className={inputCls + ' pr-10' + (passShort ? ' border-red-300 focus:border-red-400' : '')} />
                    <button type='button' onClick={() => setShowPass(p => !p)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passShort && <p className={errorCls}>Must have 8+ chars, uppercase, lowercase, number, special</p>}
                  {!passShort && newPassword.length === 0 && (
                    <p className='font-sans text-[10px] text-neutral-400 mt-1'>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>
                  )}
                </div>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Confirm Password</label>
                  <input type={showPass ? 'text' : 'password'} value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    onDrop={e => e.preventDefault()}
                    autoComplete='new-password'
                    className={inputCls + (passMismatch ? ' border-red-300 focus:border-red-400' : passMatch ? ' border-green-300 focus:border-green-400' : '')} />
                  {passMismatch && <p className={errorCls}>Passwords do not match</p>}
                  {passMatch    && <p className='font-sans text-[10px] text-green-500 uppercase tracking-widest mt-1'>Passwords match</p>}
                </div>
              </div>
            </div>
            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setResetTarget(null)}
                className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleResetPassword} disabled={resetLoading}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
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
            <div className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Danger Zone</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Delete User</h2>
                </div>
                <button onClick={() => setDeleteTarget(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
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
                className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
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

export default UserMaintenance