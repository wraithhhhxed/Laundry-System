import { useContext, useEffect, useState } from 'react'
import { BranchesContext } from '../../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { UserPlus, X, Eye, EyeOff, Check } from 'lucide-react'

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const inputCls = 'w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
const errorCls = 'font-sans text-[10px] text-red-400 uppercase tracking-widest mt-1'

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2 font-semibold">{children}</p>
)

const Divider = () => <div className="h-px bg-blue-100 mb-6" />

const BranchStaff = () => {
  const { bToken, backendUrl, staffRole } = useContext(BranchesContext)

  const [staffList, setStaffList] = useState([])
  const [loading,   setLoading]   = useState(true)

  const [showForm,      setShowForm]      = useState(false)
  const [staffForm,     setStaffForm]     = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [showPass,      setShowPass]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [emailError,    setEmailError]    = useState('')

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get(`${backendUrl}/api/branch/staff`, { headers: authHeader(bToken) })
      if (data.success) setStaffList(data.data.staff)   // ✓ FIXED
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (bToken) fetchStaff() }, [bToken])

  const openAddStaff = () => {
    setStaffForm({ firstName: '', lastName: '', email: '', password: '' })
    setShowPass(false)
    setEmailError('')
    setShowForm(true)
  }

  const emailInvalid = staffForm.email.length > 0 && !/^\S+@\S+\.\S+$/.test(staffForm.email)
  const passShort     = staffForm.password.length > 0 && staffForm.password.length < 8

  const handleAddStaff = async () => {
    setEmailError('')
    if (!staffForm.firstName || !staffForm.lastName) return toast.error('First and last name are required.')
    if (emailInvalid || !staffForm.email)             return toast.error('Enter a valid email.')
    if (passShort || !staffForm.password)             return toast.error('Password must be at least 8 characters.')

    setSubmitting(true)
    try {
      const payload = {
        firstName: staffForm.firstName,
        lastName:  staffForm.lastName,
        email:     staffForm.email,
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

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-white">

      {/* Add Staff Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" style={{ fontFamily: "'Georgia', serif" }}>
          <div className="bg-white w-full max-w-sm" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className="px-6 py-5" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Staff Management</SectionLabel>
                  <h2 className="text-white font-sans font-black text-lg" style={{ letterSpacing: '-0.02em' }}>Add Staff</h2>
                </div>
                <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5">First Name</label>
                  <input type="text" value={staffForm.firstName} onChange={e => setStaffForm(p => ({ ...p, firstName: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5">Last Name</label>
                  <input type="text" value={staffForm.lastName} onChange={e => setStaffForm(p => ({ ...p, lastName: e.target.value }))} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5">Email</label>
                <input type="email" value={staffForm.email}
                  onChange={e => { setStaffForm(p => ({ ...p, email: e.target.value })); setEmailError('') }}
                  className={inputCls + ((emailInvalid || emailError) ? ' border-red-300 focus:border-red-400' : '')} />
                {emailInvalid && <p className={errorCls}>Enter a valid email</p>}
                {emailError && <p className={errorCls}>{emailError}</p>}
              </div>

              <div>
                <label className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={staffForm.password}
                    onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 8 characters" className={inputCls + (passShort ? ' border-red-300 focus:border-red-400' : '')} />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passShort && <p className={errorCls}>Minimum 8 characters</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddStaff}
                  disabled={submitting}
                  className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-6 py-2.5 disabled:opacity-50"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">{submitting ? 'Adding...' : 'Add Staff'}</span>
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="group relative overflow-hidden border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-6 py-2.5"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" style={{ fontFamily: "'Georgia', serif" }}>
          <div className="bg-white w-full max-w-sm" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className="px-6 py-5 bg-red-600">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel>Staff Management</SectionLabel>
                  <h2 className="text-white font-sans font-black text-lg" style={{ letterSpacing: '-0.02em' }}>Remove Staff</h2>
                </div>
                <button onClick={() => setDeleteTarget(null)} className="text-red-200 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="font-sans text-sm text-neutral-600 mb-6">
                Are you sure you want to remove <span className="font-bold text-neutral-800">{deleteTarget.firstName} {deleteTarget.lastName}</span> ({deleteTarget.email})? This cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteStaff}
                  disabled={deleting}
                  className="group relative overflow-hidden bg-red-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-6 py-2.5 disabled:opacity-50"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-red-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">{deleting ? 'Removing...' : 'Remove'}</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="group relative overflow-hidden border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-6 py-2.5"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="px-10 pt-10 pb-12" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-3 font-semibold">Branch Portal</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-white font-sans font-black" style={{ letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>
              Staff
            </h1>
            <p className="font-sans text-sm text-blue-200 mt-2">Manage staff accounts for your branch</p>
          </div>
          <button
            onClick={openAddStaff}
            className="group relative overflow-hidden bg-white text-blue-700 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-6 py-2.5 flex-shrink-0"
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center gap-1.5"><UserPlus size={14} /> Add Staff</span>
          </button>
        </div>
      </div>

      <div className="px-10 py-10 max-w-5xl mx-auto">

        <SectionLabel>Staff List</SectionLabel>
        <Divider />

        <div className="grid grid-cols-5 pb-3 border-b border-blue-100">
          {['Name', 'Email', 'Role', 'Status', 'Action'].map(h => (
            <p key={h} className="font-sans text-[10px] uppercase tracking-[0.3em] text-blue-400 font-bold">{h}</p>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && staffList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="font-sans text-xs uppercase tracking-widest text-neutral-300 font-semibold">No staff yet</p>
            <p className="font-sans text-xs text-neutral-300">Click "Add Staff" to create your first staff account</p>
          </div>
        )}

        <div className="divide-y divide-blue-50">
          {!loading && staffList.map(staff => (
            <div key={staff.id} className="grid grid-cols-5 items-center py-4">
              <p className="font-sans text-sm font-bold text-neutral-800">{staff.firstName} {staff.lastName}</p>
              <p className="font-sans text-sm text-neutral-500">{staff.email}</p>
              <p className="font-sans text-xs uppercase tracking-[0.2em] font-bold text-blue-500">{staff.role}</p>
              <div>
                {staff.isActive ? (
                  <span className="inline-flex items-center gap-1 border border-green-300 bg-green-50 text-green-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold"><Check size={9} /> Active</span>
                ) : (
                  <span className="inline-block border border-neutral-300 bg-neutral-50 text-neutral-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold">Inactive</span>
                )}
              </div>
              <div>
                {staffRole === 'BRANCH_ADMIN' && staff.role !== 'BRANCH_ADMIN' && (
                  <button
                    onClick={() => setDeleteTarget(staff)}
                    className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BranchStaff