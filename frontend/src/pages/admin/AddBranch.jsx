import { useState, useEffect, useContext, useRef } from 'react'
import { assets } from '../../assets/admin/assets/assets'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const AddBranch = () => {
  const { backendUrl, aToken, services, getAllServices } = useContext(AdminContext)

  const [branchImg,    setBranchImg]    = useState(false)
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [phone,        setPhone]        = useState('')
  const [speciality,   setSpeciality]   = useState([])
  const [about,        setAbout]        = useState('')
  const [address1,     setAddress1]     = useState('')
  const [address2,     setAddress2]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => { if (!services.length) getAllServices() }, [])
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeServices = services.filter(s => s.isActive)

  // ── Auto-compute starting fee from selected services ───────────
  const computedFee = (() => {
    if (!speciality.length) return null
    const prices = speciality
      .map(n => activeServices.find(s => s.name === n)?.price)
      .filter(p => p !== undefined)
    return prices.length ? Math.min(...prices) : null
  })()

  const toggleService = (serviceName) => {
    setSpeciality(prev =>
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    )
  }

  const removeService = (serviceName) => {
    setSpeciality(prev => prev.filter(s => s !== serviceName))
  }

  const filteredServices = activeServices.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Input handlers that BLOCK invalid characters at keystroke level ──
  // Branch name: letters and spaces only — NO numbers, NO special chars
  const handleNameChange = (e) => {
    const v = e.target.value
    if (/^[a-zA-Z ]*$/.test(v)) setName(v)
  }

  // Email: letters, numbers, and common email characters (., _, -, @, +) — no spaces, no special symbols
  const handleEmailChange = (e) => {
    const v = e.target.value
    if (/^[a-zA-Z0-9._@+\-]*$/.test(v)) setEmail(v)
  }

  // Address: letters, numbers, spaces, and basic address punctuation
  const handleAddress1Change = (e) => {
    const v = e.target.value
    if (/^[a-zA-Z0-9\s.,'#\-()\/]*$/.test(v)) setAddress1(v)
  }
  const handleAddress2Change = (e) => {
    const v = e.target.value
    if (/^[a-zA-Z0-9\s.,'#\-()\/]*$/.test(v)) setAddress2(v)
  }

  // Phone: digits only, max 11
  const handlePhoneChange = (e) => {
    const v = e.target.value
    if (/^[0-9]*$/.test(v) && v.length <= 11) setPhone(v)
  }

  // ── Validation helpers (for display + final submit) ─────────
  const emailInvalid    = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const phoneInvalid    = phone.length > 0 && !/^09\d{9}$/.test(phone)
  const address1Invalid = address1.length > 0 && address1.trim().length < 3
  const address2Invalid = address2.length > 0 && address2.trim().length < 2
  const aboutInvalid    = about.length > 0 && about.trim().length < 10

  // Password rules
  const passRules = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  }
  const passAllValid = Object.values(passRules).every(Boolean)
  const passHasAnyInput = password.length > 0
  const passShort = passHasAnyInput && !passRules.length

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    if (!branchImg)               return toast.error('Image not selected')
    if (!name.trim())             return toast.error('Branch name is required')
    if (!email.trim())            return toast.error('Email is required')
    if (emailInvalid)             return toast.error('Please enter a valid email address.')
    if (!/^09\d{9}$/.test(phone)) return toast.error('Phone must be 11 digits and start with 09.')
    if (!passRules.length)        return toast.error('Password must be at least 8 characters.')
    if (!passRules.uppercase)     return toast.error('Password must contain at least one uppercase letter.')
    if (!passRules.lowercase)     return toast.error('Password must contain at least one lowercase letter.')
    if (!passRules.number)        return toast.error('Password must contain at least one number.')
    if (!passRules.special)       return toast.error('Password must contain at least one special character.')
    if (!address1.trim())         return toast.error('Address line 1 is required')
    if (address1.trim().length < 3) return toast.error('Address line 1 must be at least 3 characters.')
    if (!address2.trim())         return toast.error('Address line 2 is required')
    if (address2.trim().length < 2) return toast.error('Address line 2 must be at least 2 characters.')
    if (speciality.length === 0)  return toast.error('Select at least one service.')
    if (!about.trim() || about.trim().length < 10)
                                  return toast.error('About section must be at least 10 characters.')

    try {
      const formData = new FormData()
      formData.append('image',      branchImg)
      formData.append('name',       name)
      formData.append('email',      email)
      formData.append('password',   password)
      formData.append('phone',      phone)
      formData.append('speciality', JSON.stringify(speciality))
      formData.append('about',      about)
      formData.append('address',    JSON.stringify({ line1: address1, line2: address2 }))

      const { data } = await axios.post(`${backendUrl}/api/admin/add-branch`, formData, { headers: { token: aToken } })
      if (data.success) {
        toast.success(data.message)
        setBranchImg(false)
        setName(''); setEmail(''); setPassword(''); setPhone('')
        setSpeciality([]); setAbout(''); setAddress1(''); setAddress2('')
      } else toast.error(data.message)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong')
    }
  }

  const inputCls     = 'px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
  const errorCls     = 'font-sans text-[10px] text-red-400 uppercase tracking-widest mt-1'
  const ruleItemCls  = (ok) =>
    `flex items-center gap-1.5 font-sans text-[10px] tracking-wide transition-colors ${ok ? 'text-green-600' : 'text-neutral-400'}`
  const ruleIcon     = (ok) => ok
    ? <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
    : <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="3" /></svg>

  return (
    <div className='bg-neutral-50 min-h-screen' style={{ fontFamily: "'Georgia', serif" }}>
      <div className='bg-blue-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
        <p className='uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans font-semibold mb-1'>Branches & Users</p>
        <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>Add Branch</h1>
      </div>

      <div className='px-7 pb-10'>
        <form onSubmit={onSubmitHandler} className='bg-white border border-blue-100' noValidate>
          <div className='px-7 py-8'>

            {/* Image */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold mb-2'>Branch Photo</p>
            <div className='h-px bg-blue-100 mb-6' />
            <div className='flex items-center gap-6 mb-8'>
              <label htmlFor='branch-img' className='cursor-pointer'>
                <div className='w-28 h-28 border border-blue-100 overflow-hidden flex items-center justify-center bg-neutral-50 hover:border-blue-400 transition-colors'>
                  <img src={branchImg ? URL.createObjectURL(branchImg) : assets.upload_area} alt=''
                    className={branchImg ? 'w-full h-full object-cover' : 'w-10 h-10 opacity-30'} />
                </div>
              </label>
              <input type='file' id='branch-img' hidden accept='image/*' onChange={(e) => setBranchImg(e.target.files[0])} />
              <div>
                <p className='font-sans text-sm text-neutral-700 mb-1'>Upload Branch Photo</p>
                <p className='font-sans text-xs text-neutral-400'>JPG, PNG or WEBP recommended</p>
              </div>
            </div>

            {/* Basic Info */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold mb-2'>Basic Information</p>
            <div className='h-px bg-blue-100 mb-6' />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8'>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Branch Name</label>
                <input type='text' placeholder='Branch name' value={name}
                  onChange={handleNameChange} required
                  className={inputCls + ' w-full'} />
                <p className='font-sans text-[10px] text-neutral-300 mt-1'>Letters and spaces only — no numbers or special characters</p>
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Phone</label>
                <input type='text' placeholder='09123456789' value={phone}
                  onChange={handlePhoneChange}
                  required className={inputCls + ' w-full' + (phoneInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {phoneInvalid && <p className={errorCls}>Must be 11 digits starting with 09</p>}
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Email</label>
                <input type='email' placeholder='branch@email.com' value={email}
                  onChange={handleEmailChange} required
                  className={inputCls + ' w-full' + (emailInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {emailInvalid
                  ? <p className={errorCls}>Please enter a valid email address</p>
                  : <p className='font-sans text-[10px] text-neutral-300 mt-1'>Letters, numbers, and . _ - @ + only</p>}
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Password</label>
                <div className='relative'>
                  <input type={showPassword ? 'text' : 'password'} placeholder='Min. 8 characters' value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className={inputCls + ' w-full pr-10' + (passShort ? ' border-red-300 focus:border-red-400' : (passAllValid && passHasAnyInput ? ' border-green-300' : ''))} />
                  <button type='button' onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-blue-400 transition-colors'>
                    {showPassword ? (
                      <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21' />
                      </svg>
                    ) : (
                      <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                        <path strokeLinecap='round' strokeLinejoin='round' d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    )}
                  </button>
                </div>
                {passHasAnyInput && (
                  <div className='mt-2 space-y-1'>
                    <p className={ruleItemCls(passRules.length)}>{ruleIcon(passRules.length)} At least 8 characters</p>
                    <p className={ruleItemCls(passRules.uppercase)}>{ruleIcon(passRules.uppercase)} One uppercase letter (A–Z)</p>
                    <p className={ruleItemCls(passRules.lowercase)}>{ruleIcon(passRules.lowercase)} One lowercase letter (a–z)</p>
                    <p className={ruleItemCls(passRules.number)}>{ruleIcon(passRules.number)} One number (0–9)</p>
                    <p className={ruleItemCls(passRules.special)}>{ruleIcon(passRules.special)} One special character (!@#$%^&*...)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold mb-2'>Address</p>
            <div className='h-px bg-blue-100 mb-6' />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8'>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Address Line 1</label>
                <input type='text' placeholder='Street / Barangay' value={address1}
                  onChange={handleAddress1Change} required
                  className={inputCls + ' w-full' + (address1Invalid ? ' border-red-300 focus:border-red-400' : '')} />
                {address1Invalid
                  ? <p className={errorCls}>At least 3 characters</p>
                  : <p className='font-sans text-[10px] text-neutral-300 mt-1'>Letters, numbers, and basic punctuation only</p>}
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Address Line 2</label>
                <input type='text' placeholder='City / Province' value={address2}
                  onChange={handleAddress2Change} required
                  className={inputCls + ' w-full' + (address2Invalid ? ' border-red-300 focus:border-red-400' : '')} />
                {address2Invalid
                  ? <p className={errorCls}>At least 2 characters</p>
                  : <p className='font-sans text-[10px] text-neutral-300 mt-1'>Letters, numbers, and basic punctuation only</p>}
              </div>
            </div>

            {/* Services - Dropdown/Combobox */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold mb-2'>
              Services Offered
              {speciality.length > 0 && <span className='ml-3 text-blue-600 normal-case tracking-normal font-sans font-bold'>{speciality.length} selected</span>}
            </p>
            <div className='h-px bg-blue-100 mb-6' />
            
            {/* Selected Services Tags */}
            {speciality.length > 0 && (
              <div className='flex flex-wrap gap-2 mb-3'>
                {speciality.map(serviceName => {
                  const service = activeServices.find(s => s.name === serviceName)
                  return (
                    <span key={serviceName} className='inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-sans text-xs font-medium'>
                      {serviceName}
                      {service && <span className='text-blue-400'>₱{service.price}</span>}
                      <button
                        type='button'
                        onClick={() => removeService(serviceName)}
                        className='text-blue-400 hover:text-red-500 transition-colors ml-1'
                      >
                        <svg xmlns='http://www.w3.org/2000/svg' className='w-3.5 h-3.5' viewBox='0 0 20 20' fill='currentColor'>
                          <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                        </svg>
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Combobox Input */}
            <div className='relative' ref={dropdownRef}>
              <div className='relative'>
                <input
                  type='text'
                  placeholder={activeServices.length === 0 ? 'No services available' : 'Search and select services...'}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => activeServices.length > 0 && setIsDropdownOpen(true)}
                  disabled={activeServices.length === 0}
                  className={inputCls + ' w-full pr-10' + (activeServices.length === 0 ? ' bg-neutral-50 cursor-not-allowed' : '')}
                />
                <button
                  type='button'
                  onClick={() => activeServices.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-400 transition-colors'
                  disabled={activeServices.length === 0}
                >
                  <svg xmlns='http://www.w3.org/2000/svg' className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                  </svg>
                </button>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && activeServices.length > 0 && (
                <div className='absolute z-50 w-full mt-1 bg-white border border-blue-100 max-h-60 overflow-auto shadow-lg'>
                  {filteredServices.length === 0 ? (
                    <div className='px-4 py-3 text-sm text-neutral-400 font-sans'>
                      No matching services found
                    </div>
                  ) : (
                    filteredServices.map(service => {
                      const selected = speciality.includes(service.name)
                      return (
                        <button
                          key={service.id}
                          type='button'
                          onClick={() => {
                            toggleService(service.name)
                            setSearchTerm('')
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full px-4 py-3 text-left font-sans text-sm transition-colors flex items-center justify-between ${
                            selected
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-neutral-50 text-neutral-700'
                          }`}
                        >
                          <span className='flex items-center gap-2'>
                            {selected && (
                              <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4 text-blue-500' viewBox='0 0 20 20' fill='currentColor'>
                                <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                              </svg>
                            )}
                            <span className={selected ? 'font-semibold' : ''}>{service.name}</span>
                          </span>
                          <span className={`text-xs ${selected ? 'text-blue-400' : 'text-neutral-400'}`}>
                            ₱{service.price}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Starting Fee Preview */}
            <div className='mt-6 mb-8'>
              {computedFee !== null ? (
                <div className='inline-flex items-center gap-3 px-5 py-3 bg-blue-50 border border-blue-200'>
                  <span className='font-sans text-xs text-blue-400 uppercase tracking-widest'>Starting at</span>
                  <span className='font-sans font-black text-blue-700 text-xl' style={{ letterSpacing: '-0.02em' }}>₱{computedFee}</span>
                  <span className='font-sans text-[10px] text-neutral-400'>lowest selected service · auto-saved</span>
                </div>
              ) : (
                <p className='font-sans text-xs text-neutral-300'>Select services above to compute starting fee.</p>
              )}
            </div>

            {/* About */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold mb-2'>About</p>
            <div className='h-px bg-blue-100 mb-6' />
            <textarea placeholder='About the branch' value={about} onChange={(e) => setAbout(e.target.value)}
              required rows={4}
              className={inputCls + ' w-full resize-none' + (aboutInvalid ? ' border-red-300 focus:border-red-400' : '')} />
            {aboutInvalid && <p className={errorCls}>At least 10 characters</p>}

          </div>

          <div className='px-7 py-5 border-t border-blue-100 flex justify-end'>
            <button type='submit'
              className='group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-6 py-2.5'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              <span className='relative z-10'>Add Branch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddBranch