import { useContext, useEffect, useState } from 'react'
import { BranchesContext } from '../../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { UserPlus, X, Eye, EyeOff, Check } from 'lucide-react'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const inputCls = 'w-full px-4 py-2.5 border border-neutral-300 font-sans text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors bg-white'
const inputErrorCls = 'w-full px-4 py-2.5 border border-red-400 font-sans text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-red-500 transition-colors bg-white'
const errorCls = 'font-sans text-[10px] text-red-500 uppercase tracking-widest mt-1'
const hintCls  = 'font-sans text-[10px] text-neutral-400 mt-1'

// ─── Sanitizers ──────────────────────────────────────────────────────
const sanitizeName = (v) =>
  String(v || '').replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '')

const sanitizeEmail = (v) => {
  let s = String(v || '').replace(/[^A-Za-z0-9@._+-]/g, '').toLowerCase()
  s = s.replace(/^[._+-]+/, '')
  return s
}

// ─── Password validators ─────────────────────────────────────────────
const pwHasUpper   = (pw) => /[A-Z]/.test(pw)
const pwHasLower   = (pw) => /[a-z]/.test(pw)
const pwHasNumber  = (pw) => /[0-9]/.test(pw)
const pwHasSpecial = (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pw)
const pwIsValid    = (pw) =>
  pw.length >= 8 && pwHasUpper(pw) && pwHasLower(pw) && pwHasNumber(pw) && pwHasSpecial(pw)

// ─── Keydown factories ───────────────────────────────────────────────
const makeNameKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z\s]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key === ' ') e.preventDefault()
}

const makeEmailKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9@._+-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
}

// ─── BeforeInput factories ───────────────────────────────────────────
const makeNameBeforeInput = (currentValue) => (e) => {
  const data = e.data || ''
  if (!data) return
  if (!/^[A-Za-z\s]+$/.test(data)) { e.preventDefault(); return }
  if (!currentValue && /^\s/.test(data)) e.preventDefault()
}

const makeEmailBeforeInput = (currentValue) => (e) => {
  const data = e.data || ''
  if (!data) return
  if (!/^[A-Za-z0-9@._+-]+$/.test(data)) { e.preventDefault(); return }
  if (!currentValue && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
}

// ─── Paste handler factory ───────────────────────────────────────────
const makePasteHandler = (sanitize, setter) => (e) => {
  e.preventDefault()
  const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
  setter(sanitize(pasted))
}

const BranchStaff = () => {
  const { bToken, backendUrl, staffRole } = useContext(BranchesContext)

  const [staffList, setStaffList] = useState([])
  const [loading,   setLoading]   = useState(true)

  const [showForm,      setShowForm]      = useState(false)
  const [staffForm,     setStaffForm]     = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const [showPass,      setShowPass]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [emailError,    setEmailError]    = useState('')
  const [search,        setSearch]        = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(`${backendUrl}/api/branch/staff`, { headers: authHeader(bToken) })
      if (data.success) setStaffList(data.data.staff)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (bToken) fetchStaff() }, [bToken])

  const openAddStaff = () => {
    setStaffForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
    setShowPass(false)
    setEmailError('')
    setShowForm(true)
  }

  // ─── Computed validations ──────────────────────────────────────
  const firstNameInvalid  = staffForm.firstName.length > 0 && !/^[A-Za-z\s]{2,}$/.test(staffForm.firstName.trim())
  const lastNameInvalid   = staffForm.lastName.length > 0 && !/^[A-Za-z\s]{2,}$/.test(staffForm.lastName.trim())
  const emailInvalid      = staffForm.email.length > 0 && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(staffForm.email)
  const passInvalid       = staffForm.password.length > 0 && !pwIsValid(staffForm.password)
  const confirmMismatch   = staffForm.confirmPassword.length > 0 && staffForm.confirmPassword !== staffForm.password
  const confirmMatch      = staffForm.confirmPassword.length > 0 && staffForm.confirmPassword === staffForm.password

  const handleAddStaff = async () => {
    setEmailError('')

    const cleanFirst = sanitizeName(staffForm.firstName).trim()
    const cleanLast  = sanitizeName(staffForm.lastName).trim()
    const cleanEmail = sanitizeEmail(staffForm.email)

    if (!cleanFirst || !cleanLast) return toast.error('First and last name are required.')
    if (!/^[A-Za-z\s]{2,}$/.test(cleanFirst)) return toast.error('First name can only contain letters and spaces.')
    if (!/^[A-Za-z\s]{2,}$/.test(cleanLast))  return toast.error('Last name can only contain letters and spaces.')
    if (!cleanEmail)                          return toast.error('Email is required.')
    if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(cleanEmail))
                                              return toast.error('Enter a valid email address.')
    if (!pwIsValid(staffForm.password))
      return toast.error('Password must be 8+ chars with uppercase, lowercase, number, and special character.')
    if (staffForm.password !== staffForm.confirmPassword)
      return toast.error('Passwords do not match.')

    setSubmitting(true)
    try {
      const payload = {
        firstName: cleanFirst,
        lastName:  cleanLast,
        email:     cleanEmail,
        password:  staffForm.password,
      }
      const { data } = await axios.post(`${backendUrl}/api/branch/staff`, payload, { headers: authHeader(bToken) })
      if (data.success) {
        toast.success(data.message || 'Staff added successfully')
        setShowForm(false)
        fetchStaff()
      } else {
        if (data.message?.toLowerCase().includes('email')) setEmailError(data.message)
        else toast.error(data.message)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add staff'
      if (msg.toLowerCase().includes('email')) setEmailError(msg)
      else toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/branch/staff/${deleteTarget.id}`,
        { headers: authHeader(bToken) }
      )
      if (data.success) {
        toast.success(data.message || 'Staff removed successfully')
        setDeleteTarget(null)
        fetchStaff()
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = staffList.filter(s => {
    const q = search.toLowerCase()
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role?.toLowerCase().includes(q)
    )
  })

  // ─── Shared grid template (so header + rows align perfectly) ───
  const GRID = 'grid grid-cols-[60px_1.4fr_1.8fr_150px_130px_120px]'

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Add Staff Modal */}
      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='bg-white w-full max-w-sm' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #1d4ed8' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Staff Management</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Add Staff</h2>
                </div>
                <button onClick={() => setShowForm(false)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                {/* First Name */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>First Name</label>
                  <input
                    type='text'
                    value={staffForm.firstName}
                    onKeyDown={makeNameKeyDown(staffForm.firstName)}
                    onBeforeInput={makeNameBeforeInput(staffForm.firstName)}
                    onPaste={makePasteHandler(sanitizeName, v => setStaffForm(p => ({ ...p, firstName: v })))}
                    onDrop={e => e.preventDefault()}
                    onChange={e => setStaffForm(p => ({ ...p, firstName: sanitizeName(e.target.value) }))}
                    autoComplete='off'
                    className={firstNameInvalid ? inputErrorCls : inputCls}
                  />
                  {firstNameInvalid && <p className={errorCls}>Letters and spaces only</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Last Name</label>
                  <input
                    type='text'
                    value={staffForm.lastName}
                    onKeyDown={makeNameKeyDown(staffForm.lastName)}
                    onBeforeInput={makeNameBeforeInput(staffForm.lastName)}
                    onPaste={makePasteHandler(sanitizeName, v => setStaffForm(p => ({ ...p, lastName: v })))}
                    onDrop={e => e.preventDefault()}
                    onChange={e => setStaffForm(p => ({ ...p, lastName: sanitizeName(e.target.value) }))}
                    autoComplete='off'
                    className={lastNameInvalid ? inputErrorCls : inputCls}
                  />
                  {lastNameInvalid && <p className={errorCls}>Letters and spaces only</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Email</label>
                <input
                  type='text'
                  inputMode='email'
                  name='branch-staff-email'
                  value={staffForm.email}
                  onKeyDown={makeEmailKeyDown(staffForm.email)}
                  onBeforeInput={makeEmailBeforeInput(staffForm.email)}
                  onPaste={makePasteHandler(sanitizeEmail, v => { setStaffForm(p => ({ ...p, email: v })); setEmailError('') })}
                  onDrop={e => e.preventDefault()}
                  onChange={e => { setStaffForm(p => ({ ...p, email: sanitizeEmail(e.target.value) })); setEmailError('') }}
                  autoComplete='off'
                  className={(emailInvalid || emailError) ? inputErrorCls : inputCls}
                />
                {emailInvalid && <p className={errorCls}>Enter a valid email</p>}
                {emailError && <p className={errorCls}>{emailError}</p>}
              </div>

              {/* Password */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Password</label>
                <div className='relative'>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={staffForm.password}
                    onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                    onDrop={e => e.preventDefault()}
                    autoComplete='new-password'
                    placeholder='Min. 8 chars with A-a-1-!'
                    className={(passInvalid ? inputErrorCls : inputCls) + ' pr-10'}
                  />
                  <button type='button' onClick={() => setShowPass(p => !p)} className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-500 transition-colors'>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passInvalid && <p className={errorCls}>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>}
                {!passInvalid && staffForm.password.length === 0 && (
                  <p className={hintCls}>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={staffForm.confirmPassword}
                  onChange={e => setStaffForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  onDrop={e => e.preventDefault()}
                  autoComplete='new-password'
                  className={confirmMismatch ? inputErrorCls : confirmMatch ? (inputCls + ' border-green-400 focus:border-green-500') : inputCls}
                />
                {confirmMismatch && <p className={errorCls}>Passwords do not match</p>}
                {confirmMatch && <p className='font-sans text-[10px] text-green-600 uppercase tracking-widest mt-1'>Passwords match</p>}
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
                onClick={handleAddStaff}
                disabled={submitting}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-50'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{submitting ? 'Adding...' : 'Add Staff'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4'>
          <div className='bg-white w-full max-w-sm' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5 bg-red-600'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-red-200 font-sans font-semibold mb-0.5'>Staff Management</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Remove Staff</h2>
                </div>
                <button onClick={() => setDeleteTarget(null)} className='text-red-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-600 mb-6'>
                Are you sure you want to remove <span className='font-bold text-neutral-800'>{deleteTarget.firstName} {deleteTarget.lastName}</span> ({deleteTarget.email})? This cannot be undone.
              </p>
            </div>

            <div className='px-6 pb-6 flex gap-3'>
              <button
                onClick={() => setDeleteTarget(null)}
                className='group relative overflow-hidden flex-1 border border-neutral-300 text-neutral-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-neutral-100 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button
                onClick={handleDeleteStaff}
                disabled={deleting}
                className='group relative overflow-hidden flex-1 bg-red-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-50'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className='absolute inset-0 bg-red-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{deleting ? 'Removing...' : 'Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blue Panel Header */}
      <div
        className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #1d4ed8' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>
          Branch Portal
        </p>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1
              className='font-sans font-black text-white'
              style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
            >
              Staff
            </h1>
            <p className='font-sans text-xs text-blue-200 mt-1'>Manage staff accounts for your branch</p>
          </div>
          <button
            onClick={openAddStaff}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5 flex-shrink-0'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10 flex items-center gap-1.5'><UserPlus size={14} /> Add Staff</span>
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
              placeholder='Search staff by name, email, or role...'
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
            {' '}of {staffList.length} staff member{staffList.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>

          {/* Header */}
          <div className={`${GRID} bg-blue-50 border-b border-neutral-200`}>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>No.</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Name</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Email</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Role</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3 border-r border-neutral-200'>Status</span>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-7 py-3'>Action</span>
          </div>

          {loading ? (
            <div className='py-16 flex items-center justify-center'>
              <div className='w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='py-16 text-center font-sans text-sm text-neutral-400'>
              {staffList.length === 0
                ? 'No staff yet. Click "+ Add Staff" to create your first staff account.'
                : 'No staff match your search.'}
            </div>
          ) : (
            <div className='divide-y divide-neutral-200'>
              {filtered.map((staff, index) => (
                <div
                  key={staff.id}
                  className={`${GRID} items-center hover:bg-blue-50 transition-colors`}
                >
                  {/* Number */}
                  <span className='font-sans font-bold text-sm text-neutral-500 px-4 py-4 border-r border-neutral-200 text-center'>
                    {index + 1}
                  </span>

                  {/* Name */}
                  <div className='px-7 py-4 border-r border-neutral-200 min-w-0'>
                    <span className='font-sans font-semibold text-sm text-neutral-800 block truncate'>
                      {staff.firstName} {staff.lastName}
                    </span>
                  </div>

                  {/* Email */}
                  <div className='px-7 py-4 border-r border-neutral-200 min-w-0'>
                    <span className='font-sans text-sm text-neutral-600 block truncate' title={staff.email}>
                      {staff.email}
                    </span>
                  </div>

                  {/* Role */}
                  <div className='px-7 py-4 border-r border-neutral-200'>
                    <span className='font-sans text-xs uppercase tracking-[0.2em] font-bold text-blue-600 whitespace-nowrap'>
                      {staff.role}
                    </span>
                  </div>

                  {/* Status */}
                  <div className='px-7 py-4 border-r border-neutral-200'>
                    {staff.isActive ? (
                      <span className='inline-flex items-center gap-1 border border-green-300 bg-green-50 text-green-700 px-2 py-1 uppercase tracking-[0.2em] text-[10px] font-sans font-bold w-fit whitespace-nowrap'>
                        <Check size={9} /> Active
                      </span>
                    ) : (
                      <span className='inline-block border border-neutral-300 bg-neutral-100 text-neutral-600 px-2 py-1 uppercase tracking-[0.2em] text-[10px] font-sans font-bold w-fit whitespace-nowrap'>
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div className='px-7 py-4'>
                    {staffRole === 'BRANCH_ADMIN' && staff.role !== 'BRANCH_ADMIN' && (
                      <button
                        onClick={() => setDeleteTarget(staff)}
                        className='font-sans text-xs font-bold uppercase tracking-[0.15em] text-red-500 hover:text-red-700 transition-colors'
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BranchStaff