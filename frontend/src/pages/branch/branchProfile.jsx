import { useContext, useEffect, useState, useRef } from 'react'
import { BranchesContext } from '../../context/BranchesContext'

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2 font-semibold">{children}</p>
)

const Divider = () => <div className="h-px bg-blue-100 mb-6" />

// ─── Sanitizers ──────────────────────────────────────────────────────
// Phone: digits only, max 11
const sanitizePhone = (v) =>
  String(v || '').replace(/[^0-9]/g, '').slice(0, 11)

// Address: letters, numbers, spaces, comma, period, #, hyphen
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

// About: letters, numbers, spaces, basic punctuation
const sanitizeAbout = (v) => {
  let s = String(v || '')
  s = s.replace(/[^A-Za-z0-9\s.,'&()!?%\-]/g, '')
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/-{2,}/g, '-')
  s = s.replace(/^[\s\-.,!?%]+/, '')
  return s
}

// ─── Keydown factories ───────────────────────────────────────────────
const makePhoneKeyDown = (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault()
}

const makeAddressKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9\s,.#\-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
}

const makeAboutKeyDown = (currentValue) => (e) => {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
  if (allowed.includes(e.key)) return
  if (e.ctrlKey || e.metaKey) return
  if (e.key.length === 1 && !/[A-Za-z0-9\s.,'&()!?%\-]/.test(e.key)) { e.preventDefault(); return }
  if (!currentValue && e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) e.preventDefault()
}

// ─── BeforeInput factories ───────────────────────────────────────────
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

// ─── Paste handler factory ───────────────────────────────────────────
const makePasteHandler = (sanitize, setter) => (e) => {
  e.preventDefault()
  const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
  setter(sanitize(pasted))
}

const BranchProfile = () => {
  const { bToken, branchProfile, getBranchProfile, updateBranchProfile } = useContext(BranchesContext)

  const [isEdit,        setIsEdit]        = useState(false)
  const [line1,         setLine1]         = useState('')
  const [line2,         setLine2]         = useState('')
  const [available,     setAvailable]     = useState(true)
  const [about,         setAbout]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [imageFile,     setImageFile]     = useState(null)
  const [imagePreview,  setImagePreview]  = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [phoneError,    setPhoneError]    = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (bToken) getBranchProfile()
  }, [bToken])

  useEffect(() => {
    if (branchProfile) {
      setLine1(sanitizeAddress(branchProfile.address?.line1 || ''))
      setLine2(sanitizeAddress(branchProfile.address?.line2 || ''))
      setAvailable(branchProfile.available)
      setAbout(sanitizeAbout(branchProfile.about || ''))
      setPhone(sanitizePhone(branchProfile.phone || ''))
      setImageFile(null)
      setImagePreview(null)
      setPhoneError('')
    }
  }, [branchProfile])

  // ── Phone validation: dapat 11 digits at nagsisimula sa 09 ────────
  const validatePhone = (value) => {
    if (!value || value.length === 0) return ''          // empty is OK (optional)
    if (!/^\d+$/.test(value)) return 'Phone can only contain numbers'
    if (value.length !== 11) return 'Phone must be 11 digits'
    if (!value.startsWith('09')) return 'Phone must start with 09'
    return ''
  }

  const handlePhoneChange = (e) => {
    const cleaned = sanitizePhone(e.target.value)
    setPhone(cleaned)
    setPhoneError(validatePhone(cleaned))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleCancel = () => {
    setIsEdit(false)
    setImageFile(null)
    setImagePreview(null)
    setPhoneError('')
    if (branchProfile) {
      setLine1(sanitizeAddress(branchProfile.address?.line1 || ''))
      setLine2(sanitizeAddress(branchProfile.address?.line2 || ''))
      setAvailable(branchProfile.available)
      setAbout(sanitizeAbout(branchProfile.about || ''))
      setPhone(sanitizePhone(branchProfile.phone || ''))
    }
  }

  const handleSave = async () => {
    // Final phone validation
    const phoneErr = validatePhone(phone)
    if (phoneErr) {
      setPhoneError(phoneErr)
      return
    }
    setSaving(true)
    await updateBranchProfile({
      address: JSON.stringify({
        line1: sanitizeAddress(line1),
        line2: sanitizeAddress(line2),
      }),
      available,
      about: sanitizeAbout(about),
      phone: sanitizePhone(phone),
      ...(imageFile && { image: imageFile }),
    })
    setSaving(false)
    setIsEdit(false)
    setImageFile(null)
    setImagePreview(null)
    setPhoneError('')
  }

  if (!branchProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const displayImage = imagePreview || branchProfile.image
  const inputClass   = "w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white"
  const inputErrorClass = "w-full px-4 py-2.5 border border-red-300 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-red-400 transition-colors bg-white"

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-white">

      {/* Page header */}
      <div
        className="px-10 pt-10 pb-12"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}
      >
        <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-3 font-semibold">Branch Portal</p>
        <h1
          className="text-white font-sans font-black"
          style={{ letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}
        >
          Branch Profile
        </h1>
        <p className="font-sans text-sm text-blue-200 mt-2">View and update your branch information</p>
      </div>

      {/* Split panel */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-200px)]">

        {/* Left — blue identity panel */}
        <div
          className="lg:w-72 flex-shrink-0 flex flex-col items-center px-10 py-12 gap-6"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(255,255,255,0.07) 0%, transparent 60%), #1d4ed8' }}
        >
          {/* Avatar */}
          <div className="relative">
            <div className="w-28 h-28 overflow-hidden border-4 border-white/20 flex-shrink-0">
              {displayImage
                ? <img src={displayImage} alt={branchProfile.name} className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full bg-blue-800 flex items-center justify-center">
                    <span className="text-white font-black font-sans text-4xl">
                      {branchProfile.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )
              }
            </div>

            {isEdit && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-blue-700 font-sans text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 whitespace-nowrap hover:bg-blue-50 transition-colors"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                >
                  Change Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </>
            )}
          </div>

          {/* Identity */}
          <div className="text-center mt-2">
            <p className="text-white font-sans font-black text-lg leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {branchProfile.name}
            </p>
            <p className="text-blue-200 font-sans text-xs mt-1 font-medium">{branchProfile.email}</p>
          </div>

          {/* Availability badge */}
          <span className={`inline-block border px-3 py-1 uppercase tracking-[0.2em] text-[10px] font-sans font-bold ${
            branchProfile.available
              ? 'border-green-400 bg-green-400/10 text-green-300'
              : 'border-red-400 bg-red-400/10 text-red-300'
          }`}>
            {branchProfile.available ? 'Available' : 'Unavailable'}
          </span>

          {/* Services */}
          {(branchProfile.speciality || []).length > 0 && (
            <div className="w-full">
              <p className="uppercase tracking-[0.35em] text-[10px] text-blue-300 font-sans mb-3 font-semibold text-center">Services</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {(branchProfile.speciality || []).map(s => (
                  <span key={s} className="inline-block border border-white/20 text-blue-100 px-2 py-0.5 uppercase tracking-[0.15em] text-[10px] font-sans font-semibold bg-white/10">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — fields panel */}
        <div className="flex-1 px-10 py-12">

          {/* Phone */}
          <div className="mb-8">
            <SectionLabel>Phone</SectionLabel>
            <Divider />
            {isEdit ? (
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={makePhoneKeyDown}
                  onPaste={makePasteHandler(sanitizePhone, v => { setPhone(v); setPhoneError(validatePhone(v)) })}
                  onDrop={e => e.preventDefault()}
                  placeholder="e.g. 09171234567"
                  autoComplete="off"
                  maxLength={11}
                  className={phoneError ? inputErrorClass : inputClass}
                />
                {phoneError && (
                  <p className="font-sans text-[10px] text-red-500 uppercase tracking-widest mt-1.5">{phoneError}</p>
                )}
              </div>
            ) : (
              <p className="font-sans text-sm font-semibold text-neutral-700">{branchProfile.phone || '—'}</p>
            )}
          </div>

          {/* About */}
          <div className="mb-8">
            <SectionLabel>About</SectionLabel>
            <Divider />
            {isEdit
              ? <textarea value={about}
                  onChange={e => setAbout(sanitizeAbout(e.target.value))}
                  onKeyDown={makeAboutKeyDown(about)}
                  onBeforeInput={makeAboutBeforeInput(about)}
                  onPaste={makePasteHandler(sanitizeAbout, setAbout)}
                  onDrop={e => e.preventDefault()}
                  rows={4} placeholder="Tell customers about your branch..."
                  autoComplete="off"
                  className={`${inputClass} resize-none`} />
              : <p className="font-sans text-sm font-medium text-neutral-600 leading-relaxed">{branchProfile.about || '—'}</p>
            }
          </div>

          {/* Address */}
          <div className="mb-8">
            <SectionLabel>Address</SectionLabel>
            <Divider />
            {isEdit ? (
              <div className="flex flex-col gap-2">
                <input value={line1}
                  onChange={e => setLine1(sanitizeAddress(e.target.value))}
                  onKeyDown={makeAddressKeyDown(line1)}
                  onBeforeInput={makeAddressBeforeInput(line1)}
                  onPaste={makePasteHandler(sanitizeAddress, setLine1)}
                  onDrop={e => e.preventDefault()}
                  placeholder="Street / Barangay"
                  autoComplete="off"
                  className={inputClass} />
                <input value={line2}
                  onChange={e => setLine2(sanitizeAddress(e.target.value))}
                  onKeyDown={makeAddressKeyDown(line2)}
                  onBeforeInput={makeAddressBeforeInput(line2)}
                  onPaste={makePasteHandler(sanitizeAddress, setLine2)}
                  onDrop={e => e.preventDefault()}
                  placeholder="City / Province"
                  autoComplete="off"
                  className={inputClass} />
              </div>
            ) : (
              <p className="font-sans text-sm font-semibold text-neutral-700">
                {branchProfile.address?.line1
                  ? `${branchProfile.address.line1}${branchProfile.address.line2 ? ', ' + branchProfile.address.line2 : ''}`
                  : '—'}
              </p>
            )}
          </div>

          {/* Availability toggle */}
          <div className="mb-10">
            <SectionLabel>Availability</SectionLabel>
            <Divider />
            {isEdit ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAvailable(true)}
                  className={`font-sans text-xs uppercase tracking-[0.2em] font-bold px-5 py-2.5 border transition-colors ${
                    available
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-blue-100 text-neutral-400 hover:border-blue-300 hover:text-blue-500'
                  }`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                >
                  Available
                </button>
                <button
                  type="button"
                  onClick={() => setAvailable(false)}
                  className={`font-sans text-xs uppercase tracking-[0.2em] font-bold px-5 py-2.5 border transition-colors ${
                    !available
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-blue-100 text-neutral-400 hover:border-blue-300 hover:text-blue-500'
                  }`}
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                >
                  Unavailable
                </button>
              </div>
            ) : (
              <span className={`inline-block border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold ${
                branchProfile.available
                  ? 'border-green-300 bg-green-50 text-green-600'
                  : 'border-red-300 bg-red-50 text-red-500'
              }`}>
                {branchProfile.available ? 'Available' : 'Unavailable'}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isEdit ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving || !!phoneError}
                  className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-7 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="group relative overflow-hidden border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-7 py-2.5 disabled:opacity-50"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEdit(true)}
                className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-7 py-2.5"
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                <span className="relative">Edit Profile</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default BranchProfile