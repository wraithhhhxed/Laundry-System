import { useState, useEffect, useContext } from 'react'
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

  useEffect(() => { if (!services.length) getAllServices() }, [])
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

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    if (!branchImg)             return toast.error('Image not selected')
    if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(name.trim())) return toast.error('Branch name contains invalid characters.')
    if (!/^09\d{9}$/.test(phone))  return toast.error('Phone must be 11 digits and start with 09.')
    if (password.length < 8)        return toast.error('Password must be at least 8 characters.')
    if (speciality.length === 0)    return toast.error('Select at least one service.')

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

  const phoneInvalid = phone.length > 0 && !/^09\d{9}$/.test(phone)
  const passShort    = password.length > 0 && password.length < 8
  const inputCls     = 'px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white'
  const errorCls     = 'font-sans text-[10px] text-red-400 uppercase tracking-widest mt-1'

  return (
    <div className='bg-neutral-50 min-h-screen' style={{ fontFamily: "'Georgia', serif" }}>
      <div className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>Branches & Users</p>
        <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>Add Branch</h1>
      </div>

      <div className='px-7 pb-10'>
        <form onSubmit={onSubmitHandler} className='bg-white border border-violet-100'>
          <div className='px-7 py-8'>

            {/* Image */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>Branch Photo</p>
            <div className='h-px bg-violet-100 mb-6' />
            <div className='flex items-center gap-6 mb-8'>
              <label htmlFor='branch-img' className='cursor-pointer'>
                <div className='w-28 h-28 border border-violet-100 overflow-hidden flex items-center justify-center bg-neutral-50 hover:border-violet-400 transition-colors'>
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
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>Basic Information</p>
            <div className='h-px bg-violet-100 mb-6' />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8'>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Branch Name</label>
                <input type='text' placeholder='Branch name' value={name} onChange={(e) => setName(e.target.value)} required className={inputCls + ' w-full'} />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Phone</label>
                <input type='text' placeholder='09123456789' value={phone}
                  onChange={(e) => { const v = e.target.value; if (/^[0-9]*$/.test(v) && v.length <= 11) setPhone(v) }}
                  required className={inputCls + ' w-full' + (phoneInvalid ? ' border-red-300 focus:border-red-400' : '')} />
                {phoneInvalid && <p className={errorCls}>Must be 11 digits starting with 09</p>}
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Email</label>
                <input type='email' placeholder='branch@email.com' value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls + ' w-full'} />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Password</label>
                <div className='relative'>
                  <input type={showPassword ? 'text' : 'password'} placeholder='Min. 8 characters' value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className={inputCls + ' w-full pr-10' + (passShort ? ' border-red-300 focus:border-red-400' : '')} />
                  <button type='button' onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-violet-400 transition-colors'>
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
                {passShort && <p className={errorCls}>Minimum 8 characters</p>}
              </div>
            </div>

            {/* Address */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>Address</p>
            <div className='h-px bg-violet-100 mb-6' />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8'>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Address Line 1</label>
                <input type='text' placeholder='Street / Barangay' value={address1} onChange={(e) => setAddress1(e.target.value)} required className={inputCls + ' w-full'} />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='font-sans text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500'>Address Line 2</label>
                <input type='text' placeholder='City / Province' value={address2} onChange={(e) => setAddress2(e.target.value)} required className={inputCls + ' w-full'} />
              </div>
            </div>

            {/* Services */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>
              Services Offered
              {speciality.length > 0 && <span className='ml-3 text-violet-600 normal-case tracking-normal font-sans font-bold'>{speciality.length} selected</span>}
            </p>
            <div className='h-px bg-violet-100 mb-6' />
            <div className='flex flex-wrap gap-2 mb-4'>
              {activeServices.length === 0 ? (
                <p className='font-sans text-xs text-neutral-300'>No active services found. Add services first.</p>
              ) : activeServices.map(service => {
                const selected = speciality.includes(service.name)
                return (
                  <button key={service._id} type='button' onClick={() => toggleService(service.name)}
                    className={`px-4 py-2 font-sans text-xs tracking-[0.2em] uppercase font-bold border transition-colors ${
                      selected ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-neutral-400 border-violet-100 hover:border-violet-400 hover:text-violet-600'
                    }`}>
                    {selected && <span className='mr-1.5'>✓</span>}
                    {service.name}
                    <span className={`ml-2 text-[10px] font-sans ${selected ? 'text-violet-200' : 'text-neutral-300'}`}>₱{service.price}</span>
                  </button>
                )
              })}
            </div>

            {/* Starting Fee Preview */}
            <div className='mb-8'>
              {computedFee !== null ? (
                <div className='inline-flex items-center gap-3 px-5 py-3 bg-violet-50 border border-violet-200'>
                  <span className='font-sans text-xs text-violet-400 uppercase tracking-widest'>Starting at</span>
                  <span className='font-sans font-black text-violet-700 text-xl' style={{ letterSpacing: '-0.02em' }}>₱{computedFee}</span>
                  <span className='font-sans text-[10px] text-neutral-400'>lowest selected service · auto-saved</span>
                </div>
              ) : (
                <p className='font-sans text-xs text-neutral-300'>Select services above to compute starting fee.</p>
              )}
            </div>

            {/* About */}
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>About</p>
            <div className='h-px bg-violet-100 mb-6' />
            <textarea placeholder='About the branch' value={about} onChange={(e) => setAbout(e.target.value)}
              required rows={4} className={inputCls + ' w-full resize-none'} />

          </div>

          <div className='px-7 py-5 border-t border-violet-100 flex justify-end'>
            <button type='submit'
              className='group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-6 py-2.5'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              <span className='relative z-10'>Add Branch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddBranch