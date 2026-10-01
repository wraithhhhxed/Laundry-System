import { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
  Search, UserCheck, UserX, Trash2, Pencil,
  X, Check, ChevronLeft, ChevronRight, Building2,
  AlertTriangle, KeyRound, Eye, EyeOff, UserPlus, Users
} from 'lucide-react'

const DEFAULT_IMG = 'https://ui-avatars.com/api/?background=2563eb&color=fff&name='
const inputCls    = 'w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white disabled:bg-neutral-50 disabled:text-neutral-400'
const errorCls    = 'font-sans text-[10px] text-red-400 uppercase tracking-widest mt-1'

// ─── Sanitizers ──────────────────────────────────────────────────────
const sanitizeName = (v) => {
  let s = String(v || '')
  s = s.replace(/[^A-Za-z0-9\s\-]/g, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/-+/g, '-')
  s = s.replace(/^[\s\-]+/, '')
  s = s.replace(/[\s\-]+$/, '')
  return s
}

const sanitizeAddress = (v) => {
  let s = String(v || '')
  s = s.replace(/[^A-Za-z0-9\s,.#\-]/g, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/,{2,}/g, ',')
  s = s.replace(/\.{2,}/g, '.')
  s = s.replace(/-{2,}/g, '-')
  s = s.replace(/^[\s,.\-#]+/, '')
  return s
}

const sanitizePhone = (v) =>
  String(v || '').replace(/[^0-9]/g, '').slice(0, 11)

const sanitizeAbout = (v) => {
  let s = String(v || '')
  s = s.replace(/[^A-Za-z0-9\s.,'&()!?%\-]/g, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/-{2,}/g, '-')
  s = s.replace(/^[\s\-.,!?%]+/, '')
  return s
}

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
  if (e.key.length === 1 && !/[A-Za-z0-9\s\-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && (e.key === '-' || e.key === ' ')) e.preventDefault()
}

const makeAddressKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9\s,.#\-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
}

const makePhoneKeyDown = (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault()
}

const makeAboutKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9\s.,'&()!?%\-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
}

const makeEmailKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9@._+-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
}

// ─── BeforeInput factories ────────
const makeNameBeforeInput = (currentValue) => (e) => {
  const data = e.data || ''
  if (!data) return
  if (!/^[A-Za-z0-9\s\-]+$/.test(data)) { e.preventDefault(); return }
  if (!currentValue && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
}

const makeAddressBeforeInput = (currentValue) => (e) => {
  const data = e.data || ''
  if (!data) return
  if (!/^[A-Za-z0-9\s,.#\-]+$/.test(data)) { e.preventDefault(); return }
  if (!currentValue && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
}

const makeAboutBeforeInput = (currentValue) => (e) => {
  const data = e.data || ''
  if (!data) return
  if (!/^[A-Za-z0-9\s.,'&()!?%\-]+$/.test(data)) { e.preventDefault(); return }
  if (!currentValue && !/^[A-Za-z0-9]/.test(data)) e.preventDefault()
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

// ── Service name shortener ────────────────────────────────────────────────────
const shortenServiceName = (name) => {
  if (!name) return 'Unknown'
  
  const shortMap = {
    'DIY Self-Service': 'DIY Self',
    'Drop-off (2Sabon 2Downy +Booster)': 'Drop-off (2S+2D+B)',
    'Full Service(1 Sabon 1DownyWash-Dry-Fold)': 'Full Svc (1S+1D)',
    'Full Service(2 Sabon 2Downy +Booster)': 'Full Svc (2S+2D+B)',
    'Drop-off (1Sabon 1Downy)': 'Drop-off (1S+1D)',
    'Drop-off (2Detergent, 2FabricConditioner+ Booste': 'Drop-off (2D+2FC+B)',
    'Full Service Wash-Dry-Fold (1 Detergent, 1 Fabric Conditioner)': 'Full Svc (1D+1FC)',
    'Drop-off (2 Detergent, 2 Fabric Conditioner + Booster)': 'Drop-off (2D+2FC+B)',
    'Full Service (1 Detergent, 1 Fabric Conditioner)': 'Full Svc (1D+1FC)',
  }
  
  if (shortMap[name]) return shortMap[name]
  
  for (const [key, value] of Object.entries(shortMap)) {
    if (name.includes(key) || key.includes(name)) return value
  }
  
  if (name.length > 25) {
    return name.substring(0, 22) + '…'
  }
  
  return name
}

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

  const [staffTarget,     setStaffTarget]     = useState(null)
  const [staffForm,       setStaffForm]       = useState({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF' })
  const [showStaffPass,   setShowStaffPass]   = useState(false)
  const [staffLoading,    setStaffLoading]    = useState(false)
  const [staffEmailError, setStaffEmailError] = useState('')

  const [viewStaffTarget, setViewStaffTarget] = useState(null)
  const [staffList,       setStaffList]       = useState([])
  const [staffListLoading, setStaffListLoading] = useState(false)
  const [deletingStaffId, setDeletingStaffId]   = useState(null)

  const [selectBranchForStaff, setSelectBranchForStaff] = useState(false)

  useEffect(() => { if (!services.length) getAllServices() }, [])
  const activeServices = services.filter(s => s.isActive)

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
    setTogglingId(branch.id)
    try {
      const { data } = await axios.patch(backendUrl + `/api/admin/branches/${branch.id}/toggle-status`, {}, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); fetchBranches() }
      else toast.error(data.message)
    } catch { toast.error('Failed to update status') }
    finally { setTogglingId(null) }
  }

  const openEdit = (branch) => {
    setEditBranch(branch)
    setEditForm({
      name:          sanitizeName(branch.name),
      phone:         sanitizePhone(branch.phone || ''),
      speciality:    branch.speciality || [],
      about:         sanitizeAbout(branch.about || ''),
      address_line1: sanitizeAddress(branch.address?.line1 || ''),
      address_line2: sanitizeAddress(branch.address?.line2 || ''),
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
  const editNameInvalid  = editForm.name?.length > 0 && !/^[A-Za-z0-9\s\-]{2,}$/.test(editForm.name.trim())

  const handleEditSave = async () => {
    const cleanName  = sanitizeName(editForm.name)
    const cleanAbout = sanitizeAbout(editForm.about)
    const cleanAddr1 = sanitizeAddress(editForm.address_line1)
    const cleanAddr2 = sanitizeAddress(editForm.address_line2)

    if (!cleanName || !/^[A-Za-z0-9\s\-]{2,}$/.test(cleanName))
      return toast.error('Branch name can only contain letters, numbers, spaces, and hyphens.')
    if (editPhoneInvalid)           return toast.error('Phone must be 11 digits and start with 09.')
    if (!editForm.speciality.length) return toast.error('Select at least one service.')

    setEditLoading(true)
    try {
      const payload = {
        name:      cleanName,
        phone:     editForm.phone,
        speciality: editForm.speciality,
        about:     cleanAbout,
        address:   { line1: cleanAddr1, line2: cleanAddr2 }
      }
      const { data } = await axios.put(backendUrl + `/api/admin/branches/${editBranch.id}`, payload, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); setEditBranch(null); fetchBranches() }
      else toast.error(data.message)
    } catch { toast.error('Failed to update branch') }
    finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/branches/${deleteTarget.id}`, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); setDeleteTarget(null); fetchBranches() }
      else toast.error(data.message)
    } catch { toast.error('Failed to delete branch') }
    finally { setDeleteLoading(false) }
  }

  const openReset = (branch) => { setResetTarget(branch); setNewPassword(''); setConfirmPass(''); setShowPass(false) }

  const handleResetPassword = async () => {
    if (!pwIsValid(newPassword))
      return toast.error('Password must be 8+ chars with uppercase, lowercase, number, and special character')
    if (newPassword !== confirmPass) return toast.error('Passwords do not match')
    setResetLoading(true)
    try {
      const { data } = await axios.patch(backendUrl + `/api/admin/branches/${resetTarget.id}/reset-password`, { newPassword }, { headers: { token: aToken } })
      if (data.success) { toast.success(data.message); setResetTarget(null) }
      else toast.error(data.message)
    } catch { toast.error('Failed to reset password') }
    finally { setResetLoading(false) }
  }

  const openAddStaff = (branch) => {
    setStaffTarget(branch)
    setStaffForm({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF' })
    setShowStaffPass(false)
    setStaffEmailError('')
  }

  const staffEmailInvalid = staffForm.email.length > 0 && !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(staffForm.email)
  const staffPassInvalid  = staffForm.password.length > 0 && !pwIsValid(staffForm.password)
  const staffFirstNameInvalid = staffForm.firstName.length > 0 && !/^[A-Za-z\s]{2,}$/.test(staffForm.firstName.trim())
  const staffLastNameInvalid  = staffForm.lastName.length > 0 && !/^[A-Za-z\s]{2,}$/.test(staffForm.lastName.trim())

  const handleAddStaff = async () => {
    setStaffEmailError('')
    const cleanFirst = sanitizeName(staffForm.firstName)
    const cleanLast  = sanitizeName(staffForm.lastName)
    const cleanEmail = sanitizeEmail(staffForm.email)

    if (!cleanFirst || !cleanLast) return toast.error('First and last name are required.')
    if (!/^[A-Za-z\s]{2,}$/.test(cleanFirst)) return toast.error('First name can only contain letters and spaces.')
    if (!/^[A-Za-z\s]{2,}$/.test(cleanLast))  return toast.error('Last name can only contain letters and spaces.')
    if (staffEmailInvalid || !cleanEmail)     return toast.error('Enter a valid email.')
    if (!pwIsValid(staffForm.password))       return toast.error('Password must be 8+ chars with uppercase, lowercase, number, and special character')

    setStaffLoading(true)
    try {
      const payload = {
        firstName: cleanFirst,
        lastName:  cleanLast,
        email:     cleanEmail,
        password:  staffForm.password,
        role:      staffForm.role,
        branchId:  staffTarget.id,
      }
      const { data } = await axios.post(backendUrl + '/api/admin/staff', payload, { headers: { token: aToken } })
      if (data.success) { 
        toast.success(data.message || 'Staff added successfully')
        setStaffTarget(null)
        fetchBranches()
      } else {
        if (data.message?.toLowerCase().includes('email')) setStaffEmailError(data.message)
        else toast.error(data.message)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add staff'
      if (msg.toLowerCase().includes('email')) setStaffEmailError(msg)
      else toast.error(msg)
    } finally {
      setStaffLoading(false)
    }
  }

  const openViewStaff = async (branch) => {
    setViewStaffTarget(branch)
    setStaffList([])
    setStaffListLoading(true)
    try {
      const { data } = await axios.get(backendUrl + `/api/admin/staff/${branch.id}`, { headers: { token: aToken } })
      if (data.success) setStaffList(data.data.staff)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load staff')
    } finally {
      setStaffListLoading(false)
    }
  }

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Remove ${staff.firstName} ${staff.lastName} from this branch?`)) return
    setDeletingStaffId(staff.id)
    try {
      const { data } = await axios.delete(backendUrl + `/api/admin/staff/${staff.id}`, { headers: { token: aToken } })
      if (data.success) {
        toast.success(data.message)
        setStaffList(prev => prev.filter(s => s.id !== staff.id))
      } else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff')
    } finally {
      setDeletingStaffId(null)
    }
  }

  const activeCount   = branches.filter(b =>  b.available).length
  const inactiveCount = branches.filter(b => !b.available).length
  const passInvalid   = newPassword.length > 0 && !pwIsValid(newPassword)
  const passMismatch  = confirmPass.length > 0 && confirmPass !== newPassword
  const passMatch     = confirmPass.length > 0 && confirmPass === newPassword

  // ─── Grid template — FIXED pixel width para sa No. column ──────────────
  const GRID = 'grid grid-cols-[50px_2fr_1fr_1.8fr_1fr_1fr_1.8fr]'

  return (
    <div className='bg-neutral-50 min-h-screen' style={{ fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>Branches & Users</p>
        <div className='flex items-center justify-between'>
          <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>Branch Maintenance</h1>
          <div className='flex items-center gap-3'>
            <button onClick={() => setSelectBranchForStaff(true)}
              className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              <span className='relative z-10'>+ Add Staff</span>
            </button>
            <button onClick={() => navigate('/admin/add-branch')}
              className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              <span className='relative z-10'>+ Add Branch</span>
            </button>
          </div>
        </div>
      </div>

      <div className='px-7 pb-10'>

        {/* Stat Cards */}
        <div className='grid grid-cols-3 gap-3 mb-8'>
          {[{ label: 'Total Branches', value: total }, { label: 'Active', value: activeCount }, { label: 'Inactive', value: inactiveCount }].map(({ label, value }) => (
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
              <input type='text' placeholder='Search by name or email...' value={search}
                onChange={(e) => setSearch(sanitizeAddress(e.target.value))}
                onKeyDown={makeAddressKeyDown(search)}
                onBeforeInput={makeAddressBeforeInput(search)}
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
          <select value={filterStatus} onChange={(e) => { setFilter(e.target.value); setPage(1) }}
            className='px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white'>
            <option value=''>All Status</option>
            <option value='true'>Active</option>
            <option value='false'>Inactive</option>
          </select>
          <span className='font-sans text-xs text-neutral-400 ml-auto'>
            <span className='font-sans font-black text-neutral-700'>{total}</span> branches
          </span>
        </div>

        {/* Table */}
        <div className='bg-white border border-neutral-200 overflow-hidden'>
          {loading ? (
            <div className='flex justify-center items-center py-20 font-sans text-sm text-neutral-400'>Loading...</div>
          ) : branches.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-20 text-neutral-300'>
              <Building2 size={32} className='mb-2 opacity-40' />
              <p className='font-sans text-sm'>No branches found</p>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className={`${GRID} bg-blue-50 border-b border-neutral-200`}>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 py-3 border-r border-neutral-200 text-center'>No.</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-left'>Branch</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Contact</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Services</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Starting At</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 border-r border-neutral-200 text-center'>Status</span>
                <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-blue-500 px-4 py-3 text-center'>Actions</span>
              </div>
              <div className='divide-y divide-neutral-200'>
                {branches.map((branch, index) => {
                  const shortNames = (branch.speciality || []).map(shortenServiceName)
                  return (
                    <div key={branch.id} className={`${GRID} items-stretch hover:bg-blue-50 transition-colors`}>

                      {/* Number */}
                      <div className='flex items-center justify-center py-5 border-r border-neutral-200'>
                        <span className='font-sans font-bold text-sm text-neutral-500'>{index + 1}</span>
                      </div>

                      {/* Branch */}
                      <div className='flex items-center gap-3 px-4 py-5 border-r border-neutral-200'>
                        <img src={branch.image || `${DEFAULT_IMG}${encodeURIComponent(branch.name)}`} alt={branch.name}
                          className='w-9 h-9 object-cover flex-shrink-0'
                          onError={e => { e.target.src = `${DEFAULT_IMG}${encodeURIComponent(branch.name)}` }} />
                        <div className='min-w-0'>
                          <div className='font-sans font-semibold text-sm text-neutral-700 truncate'>{branch.name}</div>
                          <div className='font-sans text-xs text-neutral-400 truncate'>{branch.email}</div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className='flex items-center justify-center px-4 py-5 border-r border-neutral-200'>
                        <span className='font-sans text-xs text-neutral-500'>{branch.phone || '—'}</span>
                      </div>

                      {/* Services */}
                      <div className='flex flex-wrap gap-1 items-center justify-center px-4 py-5 border-r border-neutral-200'>
                        {shortNames.slice(0, 2).map(s => (
                          <span key={s} className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-blue-200 text-blue-500 px-2 py-0.5 whitespace-nowrap' title={branch.speciality?.[shortNames.indexOf(s)] || s}>{s}</span>
                        ))}
                        {shortNames.length > 2 && <span className='font-sans text-xs text-neutral-400'>+{shortNames.length - 2}</span>}
                      </div>

                      {/* Starting At */}
                      <div className='flex items-center justify-center px-4 py-5 border-r border-neutral-200'>
                        <span className='font-sans font-black text-sm text-blue-700'>₱{branch.fees?.toLocaleString() || '—'}</span>
                      </div>

                      {/* Status */}
                      <div className='flex items-center justify-center px-4 py-5 border-r border-neutral-200'>
                        {branch.available ? (
                          <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-green-200 text-green-600 px-2 py-1 inline-flex items-center gap-1 whitespace-nowrap'><Check size={9} /> Active</span>
                        ) : (
                          <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-bold border border-red-200 text-red-500 px-2 py-1 inline-flex items-center gap-1 whitespace-nowrap'><X size={9} /> Inactive</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className='flex items-center justify-center gap-1 px-4 py-5'>
                        <button onClick={() => openEdit(branch)} title='Edit' className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'><Pencil size={14} /></button>
                        <button onClick={() => handleToggleStatus(branch)} disabled={togglingId === branch.id} title={branch.available ? 'Deactivate' : 'Activate'} className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40'>{branch.available ? <UserX size={14} /> : <UserCheck size={14} />}</button>
                        <button onClick={() => openReset(branch)} title='Reset Password' className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'><KeyRound size={14} /></button>
                        <button onClick={() => openViewStaff(branch)} title='View Staff' className='p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors'><Users size={14} /></button>
                        <button onClick={() => setDeleteTarget(branch)} title='Delete' className='p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors'><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {pages > 1 && (
            <div className='flex items-center justify-between px-7 py-4 border-t border-neutral-200'>
              <span className='font-sans text-xs text-neutral-400'>
                Page <span className='font-sans font-black text-neutral-700'>{page}</span> of <span className='font-sans font-black text-neutral-700'>{pages}</span> · {total} branches
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

      {/* ── Edit Modal ── */}
      {editBranch && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Branch Maintenance</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Edit Branch</h2>
                </div>
                <button onClick={() => setEditBranch(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6 space-y-4'>
              {/* Branch Name */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Branch Name</label>
                <input type='text' value={editForm.name || ''}
                  onKeyDown={makeNameKeyDown(editForm.name)}
                  onBeforeInput={makeNameBeforeInput(editForm.name)}
                  onPaste={makePasteHandler(sanitizeName, v => setEditForm(p => ({ ...p, name: v })))}
                  onDrop={e => e.preventDefault()}
                  onChange={e => setEditForm(p => ({ ...p, name: sanitizeName(e.target.value) }))}
                  autoComplete='off'
                  className={inputCls + (editNameInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {editNameInvalid && <p className={errorCls}>Letters, numbers, spaces, hyphens only</p>}
              </div>

              {/* Phone */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Phone</label>
                <input type='text' value={editForm.phone || ''}
                  onKeyDown={makePhoneKeyDown}
                  onPaste={makePasteHandler(sanitizePhone, v => setEditForm(p => ({ ...p, phone: v })))}
                  onDrop={e => e.preventDefault()}
                  onChange={e => setEditForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))}
                  autoComplete='off'
                  className={inputCls + (editPhoneInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {editPhoneInvalid && <p className={errorCls}>Must be 11 digits starting with 09</p>}
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Address Line 1</label>
                  <input type='text' value={editForm.address_line1 || ''}
                    onKeyDown={makeAddressKeyDown(editForm.address_line1)}
                    onBeforeInput={makeAddressBeforeInput(editForm.address_line1)}
                    onPaste={makePasteHandler(sanitizeAddress, v => setEditForm(p => ({ ...p, address_line1: v })))}
                    onDrop={e => e.preventDefault()}
                    onChange={e => setEditForm(p => ({ ...p, address_line1: sanitizeAddress(e.target.value) }))}
                    autoComplete='off'
                    className={inputCls} />
                </div>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Address Line 2</label>
                  <input type='text' value={editForm.address_line2 || ''}
                    onKeyDown={makeAddressKeyDown(editForm.address_line2)}
                    onBeforeInput={makeAddressBeforeInput(editForm.address_line2)}
                    onPaste={makePasteHandler(sanitizeAddress, v => setEditForm(p => ({ ...p, address_line2: v })))}
                    onDrop={e => e.preventDefault()}
                    onChange={e => setEditForm(p => ({ ...p, address_line2: sanitizeAddress(e.target.value) }))}
                    autoComplete='off'
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>About</label>
                <textarea value={editForm.about || ''}
                  onKeyDown={makeAboutKeyDown(editForm.about)}
                  onBeforeInput={makeAboutBeforeInput(editForm.about)}
                  onPaste={makePasteHandler(sanitizeAbout, v => setEditForm(p => ({ ...p, about: v })))}
                  onDrop={e => e.preventDefault()}
                  onChange={e => setEditForm(p => ({ ...p, about: sanitizeAbout(e.target.value) }))}
                  rows={3}
                  className='w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white resize-none' />
              </div>

              {/* Services toggle */}
              <div>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-2'>
                  Services Offered
                  {editForm.speciality?.length > 0 && <span className='ml-2 text-blue-600 normal-case tracking-normal font-bold'>{editForm.speciality.length} selected</span>}
                </label>
                <div className='flex flex-wrap gap-2 mb-3'>
                  {activeServices.map(service => {
                    const selected = editForm.speciality?.includes(service.name)
                    const shortName = shortenServiceName(service.name)
                    return (
                      <button key={service.id} type='button' onClick={() => toggleEditService(service.name)}
                        className={`px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase font-bold border transition-colors ${
                          selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-neutral-400 border-blue-100 hover:border-blue-400 hover:text-blue-600'
                        }`}
                        title={service.name}>
                        {selected && <span className='mr-1'>✓</span>}
                        {shortName}
                        <span className={`ml-1.5 text-[9px] ${selected ? 'text-blue-200' : 'text-neutral-300'}`}>₱{service.price}</span>
                      </button>
                    )
                  })}
                </div>
                {editForm.speciality?.length === 0 && <p className={errorCls}>Select at least one service</p>}

                {editComputedFee !== null && (
                  <div className='inline-flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200'>
                    <span className='font-sans text-[10px] text-blue-400 uppercase tracking-widest'>Starting at</span>
                    <span className='font-sans font-black text-blue-700 text-base' style={{ letterSpacing: '-0.02em' }}>₱{editComputedFee}</span>
                    <span className='font-sans text-[9px] text-neutral-400'>auto-computed</span>
                  </div>
                )}
              </div>
            </div>

            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setEditBranch(null)}
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
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Security</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Reset Password</h2>
                </div>
                <button onClick={() => setResetTarget(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>
            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-500 mb-5'>Setting new password for <span className='font-sans font-bold text-neutral-700'>{resetTarget.name}</span></p>
              <div className='space-y-4'>
                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>New Password</label>
                  <div className='relative'>
                    <input type={showPass ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onDrop={e => e.preventDefault()}
                      autoComplete='new-password'
                      placeholder='Min. 8 chars with A-a-1-!'
                      className={inputCls + (passInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                    <button type='button' onClick={() => setShowPass(p => !p)} className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {passInvalid && <p className={errorCls}>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>}
                  {!passInvalid && newPassword.length === 0 && (
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

      {/* ── Branch Selection Modal for Add Staff ── */}
      {selectBranchForStaff && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-md max-h-[80vh] overflow-y-auto' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Staff Management</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Select Branch</h2>
                </div>
                <button onClick={() => setSelectBranchForStaff(false)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-500 mb-5'>Choose which branch to add staff to:</p>

              {loading ? (
                <div className='flex justify-center py-10 font-sans text-sm text-neutral-400'>Loading...</div>
              ) : branches.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-neutral-300'>
                  <Building2 size={28} className='mb-2 opacity-40' />
                  <p className='font-sans text-sm'>No branches available</p>
                </div>
              ) : (
                <div className='divide-y divide-blue-50'>
                  {branches.map(branch => (
                    <button key={branch.id}
                      onClick={() => {
                        setSelectBranchForStaff(false)
                        openAddStaff(branch)
                      }}
                      className='w-full flex items-center gap-3 py-3 px-2 hover:bg-blue-50 transition-colors text-left'>
                      <img src={branch.image || `${DEFAULT_IMG}${encodeURIComponent(branch.name)}`} alt={branch.name}
                        className='w-8 h-8 object-cover flex-shrink-0'
                        onError={e => { e.target.src = `${DEFAULT_IMG}${encodeURIComponent(branch.name)}` }} />
                      <div className='min-w-0 flex-1'>
                        <p className='font-sans text-sm font-bold text-neutral-800 truncate'>{branch.name}</p>
                        <p className='font-sans text-xs text-neutral-400 truncate'>{branch.email}</p>
                      </div>
                      <ChevronRight size={16} className='text-neutral-300 flex-shrink-0' />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className='px-6 pb-6'>
              <button onClick={() => setSelectBranchForStaff(false)}
                className='group relative overflow-hidden w-full border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Staff Modal ── */}
      {staffTarget && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-sm' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Staff Management</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Add Staff</h2>
                </div>
                <button onClick={() => setStaffTarget(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-500 mb-5'>Adding staff for <span className='font-sans font-bold text-neutral-700'>{staffTarget.name}</span></p>

              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>First Name</label>
                    <input type='text' value={staffForm.firstName}
                      onKeyDown={makeNameKeyDown(staffForm.firstName)}
                      onBeforeInput={makeNameBeforeInput(staffForm.firstName)}
                      onPaste={makePasteHandler(sanitizeName, v => setStaffForm(p => ({ ...p, firstName: v })))}
                      onDrop={e => e.preventDefault()}
                      onChange={e => setStaffForm(p => ({ ...p, firstName: sanitizeName(e.target.value) }))}
                      autoComplete='off'
                      className={inputCls + (staffFirstNameInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                    {staffFirstNameInvalid && <p className={errorCls}>Letters and spaces only</p>}
                  </div>
                  <div>
                    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Last Name</label>
                    <input type='text' value={staffForm.lastName}
                      onKeyDown={makeNameKeyDown(staffForm.lastName)}
                      onBeforeInput={makeNameBeforeInput(staffForm.lastName)}
                      onPaste={makePasteHandler(sanitizeName, v => setStaffForm(p => ({ ...p, lastName: v })))}
                      onDrop={e => e.preventDefault()}
                      onChange={e => setStaffForm(p => ({ ...p, lastName: sanitizeName(e.target.value) }))}
                      autoComplete='off'
                      className={inputCls + (staffLastNameInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                    {staffLastNameInvalid && <p className={errorCls}>Letters and spaces only</p>}
                  </div>
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Email</label>
                  <input type='text' inputMode='email' value={staffForm.email}
                    onKeyDown={makeEmailKeyDown(staffForm.email)}
                    onBeforeInput={makeEmailBeforeInput(staffForm.email)}
                    onPaste={makePasteHandler(sanitizeEmail, v => setStaffForm(p => ({ ...p, email: v })))}
                    onDrop={e => e.preventDefault()}
                    onChange={e => { setStaffForm(p => ({ ...p, email: sanitizeEmail(e.target.value) })); setStaffEmailError('') }}
                    autoComplete='off'
                    name='staff-email-input'
                    className={inputCls + ((staffEmailInvalid || staffEmailError) ? ' border-red-300 focus:border-red-400' : '')} />
                  {staffEmailInvalid && <p className={errorCls}>Enter a valid email</p>}
                  {staffEmailError && <p className={errorCls}>{staffEmailError}</p>}
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Password</label>
                  <div className='relative'>
                    <input type={showStaffPass ? 'text' : 'password'} value={staffForm.password}
                      onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                      onDrop={e => e.preventDefault()}
                      autoComplete='new-password'
                      placeholder='Min. 8 chars with A-a-1-!'
                      className={inputCls + (staffPassInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                    <button type='button' onClick={() => setShowStaffPass(p => !p)} className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                      {showStaffPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {staffPassInvalid && <p className={errorCls}>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>}
                  {!staffPassInvalid && staffForm.password.length === 0 && (
                    <p className='font-sans text-[10px] text-neutral-400 mt-1'>8+ chars · 1 uppercase · 1 lowercase · 1 number · 1 special</p>
                  )}
                </div>

                <div>
                  <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>Role</label>
                  <select value={staffForm.role} onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))}
                    className='w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white'>
                    <option value='STAFF'>Staff</option>
                    <option value='BRANCH_ADMIN'>Branch Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className='px-6 pb-6 flex gap-3'>
              <button onClick={() => setStaffTarget(null)}
                className='group relative overflow-hidden flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Cancel</span>
              </button>
              <button onClick={handleAddStaff} disabled={staffLoading}
                className='group relative overflow-hidden flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5 disabled:opacity-60'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>{staffLoading ? 'Adding...' : 'Add Staff'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View/Delete Staff Modal ── */}
      {viewStaffTarget && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-md max-h-[80vh] overflow-y-auto' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Staff Management</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Branch Staff</h2>
                </div>
                <button onClick={() => setViewStaffTarget(null)} className='text-blue-200 hover:text-white transition-colors'><X size={18} /></button>
              </div>
            </div>

            <div className='px-6 py-6'>
              <p className='font-sans text-sm text-neutral-500 mb-5'>Staff at <span className='font-sans font-bold text-neutral-700'>{viewStaffTarget.name}</span></p>

              {staffListLoading ? (
                <div className='flex justify-center py-10 font-sans text-sm text-neutral-400'>Loading...</div>
              ) : staffList.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-neutral-300'>
                  <Users size={28} className='mb-2 opacity-40' />
                  <p className='font-sans text-sm'>No staff yet</p>
                </div>
              ) : (
                <div className='divide-y divide-blue-50'>
                  {staffList.map(staff => (
                    <div key={staff.id} className='flex items-center justify-between py-3'>
                      <div>
                        <p className='font-sans text-sm font-bold text-neutral-800'>{staff.firstName} {staff.lastName}</p>
                        <p className='font-sans text-xs text-neutral-400'>{staff.email}</p>
                        <span className='inline-block mt-1 uppercase tracking-[0.2em] text-[9px] font-sans font-bold text-blue-500'>{staff.role}</span>
                      </div>
                      <button onClick={() => handleDeleteStaff(staff)} disabled={deletingStaffId === staff.id}
                        className='p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40'>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='px-6 pb-6'>
              <button onClick={() => setViewStaffTarget(null)}
                className='group relative overflow-hidden w-full border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center py-2.5'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                <span className='relative z-10'>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-sm' style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className='px-6 py-5' style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-0.5'>Danger Zone</p>
                  <h2 className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>Delete Branch</h2>
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

const ModalField = ({ label, value, onChange, type = 'text', disabled = false }) => (
  <div>
    <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5'>{label}</label>
    <input type={type} value={value || ''} onChange={onChange} disabled={disabled}
      className='w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white disabled:bg-neutral-50 disabled:text-neutral-400' />
  </div>
)

export default BranchMaintenance