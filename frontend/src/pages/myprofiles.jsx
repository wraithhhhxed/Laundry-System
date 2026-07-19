import React, { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const inputCls =
  'w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'

const readCls = 'font-sans text-sm text-neutral-700 font-bold tracking-tight'

const MyProfiles = () => {
  const { userData, setUserData, backendUrl, token, loadUserProfileData } = useContext(AppContext)
  const [isEdit, setIsEdit] = useState(false)
  const [image, setImage] = useState(null)

  if (!userData) return null

  const handleSave = async () => {
    try {
      const formData = new FormData()
      formData.append('name', userData.name)
      formData.append('phone', userData.phone)
      formData.append('address', JSON.stringify(userData.address))
      formData.append('gender', userData.gender)
      formData.append('dob', userData.dob)
      if (image) formData.append('image', image)

      const { data } = await axios.post(
        backendUrl + '/api/user/update-profile',
        formData,
        { headers: { token } }
      )

      if (data.success) {
        toast.success(data.message)
        setImage(null)
        await loadUserProfileData()
        setIsEdit(false)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white min-h-screen'>

      {/* ── HEADING ── */}
      <div className='max-w-4xl mx-auto px-6 pt-14 pb-0 text-center md:text-left'>
        <span className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-3 font-bold'>
          Account Settings
        </span>
        <div className='h-px bg-blue-100 mb-10' />
        <h1
          className='leading-none text-blue-900 mb-16'
          style={{ fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 800, letterSpacing: '-0.04em' }}
        >
          My Profile.
        </h1>
      </div>

      {/* ── PROFILE CARD ── */}
      <div className='max-w-4xl mx-auto px-6 pb-20'>
        <div className='flex flex-col md:flex-row gap-0 items-stretch border border-blue-100'>

          {/* ── LEFT — avatar + name ── */}
          <div className='w-full md:w-72 flex-shrink-0 bg-blue-600 px-8 py-12 flex flex-col items-center gap-6 relative overflow-hidden'>
            <div
              className='absolute inset-0 pointer-events-none'
              style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
            />

            {/* avatar */}
            <div className='relative z-10'>
              {isEdit ? (
                <label htmlFor='image' className='cursor-pointer block relative group'>
                  <img
                    src={image ? URL.createObjectURL(image) : userData.image || assets.upload_icon}
                    alt=''
                    className='w-32 h-32 object-cover border-4 border-white/20'
                    style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)' }}
                  />
                  <div
                    className='absolute inset-0 bg-blue-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                    style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)' }}
                  >
                    <span className='font-sans text-[10px] uppercase tracking-widest text-white font-black'>Update</span>
                  </div>
                  <input type='file' id='image' accept='image/*' hidden onChange={e => setImage(e.target.files[0])} />
                </label>
              ) : (
                <img
                  src={userData.image || assets.upload_icon}
                  alt=''
                  className='w-32 h-32 object-cover border-4 border-white/10'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)' }}
                />
              )}
            </div>

            {/* name */}
            <div className='relative z-10 w-full text-center'>
              {isEdit ? (
                <input
                  type='text'
                  value={userData.name}
                  onChange={e => {
                    const v = e.target.value
                    if (/^[a-zA-Z\s.]*$/.test(v)) setUserData(prev => ({ ...prev, name: v }))
                  }}
                  className='w-full px-3 py-2 bg-white/10 border border-white/30 text-white text-center font-sans text-sm font-bold focus:outline-none focus:bg-white/20 transition-all'
                />
              ) : (
                <p className='text-white font-black leading-tight uppercase tracking-tight' style={{ fontSize: '20px' }}>
                  {userData.name}
                </p>
              )}
              <p className='font-sans text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold mt-2'>{userData.email}</p>

              {/* Google badge */}
              {userData.googleId && (
                <div className='mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20'>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff80"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff80"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#ffffff80"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff80"/>
                  </svg>
                  <span className='font-sans text-[9px] text-white/60 uppercase tracking-widest'>Google Account</span>
                </div>
              )}
            </div>

            {/* edit / save button */}
            <div className='relative z-10 w-full mt-auto pt-8'>
              <div className='h-px bg-white/10 mb-6' />
              {isEdit ? (
                <div className='flex flex-col gap-3'>
                  <button
                    onClick={handleSave}
                    className='group relative overflow-hidden w-full py-3 font-sans text-[10px] tracking-[0.2em] uppercase font-black bg-white text-blue-700 inline-flex items-center justify-center gap-2'
                    style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                  >
                    <span className='relative z-10'>Save Changes</span>
                    <div className='absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
                  </button>
                  <button
                    onClick={() => { setIsEdit(false); setImage(null) }}
                    className='w-full py-3 font-sans text-[10px] tracking-[0.2em] uppercase font-bold border border-white/30 text-white/70 hover:text-white hover:border-white transition-all'
                    style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEdit(true)}
                  className='group relative overflow-hidden w-full py-3 font-sans text-[10px] tracking-[0.2em] uppercase font-black border-2 border-white/30 text-white hover:bg-white hover:text-blue-600 transition-all duration-300'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT — info fields ── */}
          <div className='flex-1 bg-white px-8 md:px-12 py-12 flex flex-col gap-10'>

            {/* Contact */}
            <section>
              <div className='flex items-center gap-4 mb-6'>
                <span className='uppercase tracking-[0.3em] text-[10px] text-blue-500 font-sans font-black whitespace-nowrap'>
                  Contact Info
                </span>
                <div className='h-px bg-blue-50 w-full' />
              </div>

              <div className='grid grid-cols-1 gap-6'>
                <div className='flex flex-col gap-2'>
                  <label className='uppercase tracking-[0.2em] text-[9px] text-neutral-400 font-sans font-bold'>Phone Number</label>
                  {isEdit ? (
                    <input
                      className={inputCls}
                      type='text'
                      value={userData.phone}
                      onChange={e => {
                        const v = e.target.value
                        if (/^[0-9]*$/.test(v)) setUserData(prev => ({ ...prev, phone: v }))
                      }}
                    />
                  ) : (
                    <p className={readCls}>{userData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div className='flex flex-col gap-2'>
                  <label className='uppercase tracking-[0.2em] text-[9px] text-neutral-400 font-sans font-bold'>Home Address</label>
                  {isEdit ? (
                    <div className='flex flex-col gap-2'>
                      <input
                        className={inputCls}
                        type='text'
                        placeholder='Street, Barangay'
                        value={userData.address.line1}
                        onChange={e => setUserData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                      />
                      <input
                        className={inputCls}
                        type='text'
                        placeholder='City, Province'
                        value={userData.address.line2}
                        onChange={e => setUserData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                      />
                    </div>
                  ) : (
                    <p className={`${readCls} leading-relaxed`}>
                      {userData.address.line1 || 'No address set'}
                      {userData.address.line2 && <><br />{userData.address.line2}</>}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Personal Info */}
            <section>
              <div className='flex items-center gap-4 mb-6'>
                <span className='uppercase tracking-[0.3em] text-[10px] text-blue-500 font-sans font-black whitespace-nowrap'>
                  Personal Info
                </span>
                <div className='h-px bg-blue-50 w-full' />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
                <div className='flex flex-col gap-2'>
                  <label className='uppercase tracking-[0.2em] text-[9px] text-neutral-400 font-sans font-bold'>Gender</label>
                  {isEdit ? (
                    <select
                      className={inputCls}
                      value={userData.gender}
                      onChange={e => setUserData(prev => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value='Male'>Male</option>
                      <option value='Female'>Female</option>
                    </select>
                  ) : (
                    <p className={readCls}>{userData.gender || '—'}</p>
                  )}
                </div>

                <div className='flex flex-col gap-2'>
                  <label className='uppercase tracking-[0.2em] text-[9px] text-neutral-400 font-sans font-bold'>Birthday</label>
                  {isEdit ? (
                    <input
                      className={inputCls}
                      type='date'
                      value={userData.dob}
                      onChange={e => setUserData(prev => ({ ...prev, dob: e.target.value }))}
                    />
                  ) : (
                    <p className={readCls}>{userData.dob || '—'}</p>
                  )}
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

export default MyProfiles