import React, { useContext, useState, useEffect, useRef } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const inputCls =
  'w-full px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'

const readCls = 'font-sans text-sm text-neutral-700 font-bold tracking-tight'

const MILESTONES = {
  5:  { label: '10% OFF',     short: '10%' },
  10: { label: '50% OFF',     short: '50%' },
  15: { label: '₱100 OFF',    short: '₱100' },
  20: { label: 'Lucky Wheel', short: 'WHEEL' },
}

const WHEEL_PRIZES = [
  { type: 'FREE_DISCOUNT', label: '₱50 OFF' },
  { type: 'FREE_SERVICE',  label: 'FREE SERVICE' },
  { type: 'FREE_BAG',      label: 'FREE BAG' },
  { type: 'FREE_DISCOUNT', label: '₱50 OFF' },
  { type: 'FREE_SERVICE',  label: 'FREE SERVICE' },
  { type: 'FREE_BAG',      label: 'FREE BAG' },
]

const SEGMENT_ANGLE = 360 / WHEEL_PRIZES.length
const SEGMENT_COLORS = ['#2563eb', '#1d4ed8']

// Convert polar coords to cartesian (SVG coordinate space)
const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

// Build a single pie-slice path from center
const describeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end   = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

const MyProfiles = () => {
  const { userData, setUserData, backendUrl, token, loadUserProfileData } = useContext(AppContext)
  const [isEdit, setIsEdit] = useState(false)
  const [image, setImage] = useState(null)
  const [loyalty, setLoyalty] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [heldPrize, setHeldPrize] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [spinResult, setSpinResult] = useState(null)
  const [showWheelModal, setShowWheelModal] = useState(false)

  const wheelRef = useRef(null)

  const fetchLoyalty = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/user/loyalty-status', {
        headers: { token }
      })
      if (data.success) setLoyalty(data.data)
    } catch (error) {
      console.error('Failed to load loyalty status:', error.message)
    }

    try {
      const { data } = await axios.get(backendUrl + '/api/user/lucky-wheel/unredeemed', {
        headers: { token }
      })
      const spins = Array.isArray(data.data) ? data.data : []
      setHeldPrize(spins.length > 0 ? spins[0] : null)
    } catch (error) {
      console.error('Failed to load lucky wheel prize:', error.message)
    }
  }

  useEffect(() => {
    if (token) fetchLoyalty()
  }, [token])

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

  const handleSpin = async () => {
    if (spinning) return
    setSpinning(true)
    setSpinResult(null)

    const fullSpins = 5 + Math.floor(Math.random() * 3)
    const randomOffset = Math.floor(Math.random() * 360)
    const totalRotation = rotation + fullSpins * 360 + randomOffset

    setRotation(totalRotation)

    setTimeout(async () => {
      try {
        const { data } = await axios.post(
          backendUrl + '/api/user/lucky-wheel/spin',
          {},
          { headers: { token } }
        )
        if (data.data) {
          setSpinResult(data.data)
          toast.success(`You spun: ${data.data.prizeType.replace(/_/g, ' ')}!`)
          await fetchLoyalty()
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Spin failed')
      } finally {
        setSpinning(false)
      }
    }, 3600)
  }

  const closeWheelModal = () => {
    if (spinning) return
    setShowWheelModal(false)
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white min-h-screen'>

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

      <div className='max-w-4xl mx-auto px-6 pb-20'>
        <div className='flex flex-col md:flex-row gap-0 items-stretch border border-blue-100'>

          <div className='w-full md:w-72 flex-shrink-0 bg-blue-600 px-8 py-12 flex flex-col items-center gap-6 relative overflow-hidden'>
            <div
              className='absolute inset-0 pointer-events-none'
              style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
            />

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

          <div className='flex-1 bg-white px-8 md:px-12 py-12 flex flex-col gap-10'>

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

            <section>
              <div className='flex items-center gap-4 mb-6'>
                <span className='uppercase tracking-[0.3em] text-[10px] text-blue-500 font-sans font-black whitespace-nowrap'>
                  Loyalty Stamps
                </span>
                <div className='h-px bg-blue-50 w-full' />
              </div>

              {loyalty ? (
                <div>
                  <div className='grid grid-cols-10 gap-2.5 mb-4'>
                    {Array.from({ length: 20 }, (_, i) => {
                      const stampNum = i + 1
                      const filled = stampNum <= loyalty.loyaltyStamps
                      const isMilestone = MILESTONES[stampNum]
                      return (
                        <div
                          key={stampNum}
                          className={`relative aspect-square flex items-center justify-center border-2 font-sans text-[13px] font-black
                            ${filled ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-100 text-blue-300'}
                            ${isMilestone ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}
                        >
                          {filled ? '✓' : stampNum}
                          {isMilestone && (
                            <span className='absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm' />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4'>
                    {Object.entries(MILESTONES).map(([stamp, m]) => {
                      const stampNum = Number(stamp)
                      const unlockedMap = {
                        5:  !!(loyalty.fifthAvailable || loyalty.fifthStampRedeemedAt),
                        10: !!(loyalty.tenthAvailable || loyalty.tenthStampRedeemedAt),
                        15: !!(loyalty.fifteenthAvailable || loyalty.fifteenthStampRedeemedAt),
                        20: (loyalty.loyaltyStamps || 0) >= 19,
                      }
                      const hintMap = { 5: 'Unlocks at 4 stamps', 10: 'Unlocks at 9 stamps', 15: 'Unlocks at 14 stamps', 20: 'At 20 stamps' }
                      const unlocked = unlockedMap[stampNum]
                      return (
                        <div
                          key={stamp}
                          className={`border px-4 py-3 flex flex-col gap-1
                            ${unlocked ? 'border-amber-300 bg-amber-50' : 'border-neutral-100 bg-neutral-50'}`}
                        >
                          <span className={`font-sans text-[10px] uppercase tracking-[0.15em] font-black
                            ${unlocked ? 'text-amber-700' : 'text-neutral-400'}`}>
                            {stampNum}th Stamp
                          </span>
                          <span className={`font-sans text-sm font-black
                            ${unlocked ? 'text-neutral-800' : 'text-neutral-400'}`}>
                            {m.label}
                          </span>
                          {!unlocked && (
                            <span className='font-sans text-[10px] text-neutral-400'>{hintMap[stampNum]}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {heldPrize && (
                    <div className='border-2 border-blue-200 bg-blue-50 p-4'>
                      <p className='font-sans text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1'>
                        Lucky Wheel Prize
                      </p>
                      <p className='font-sans text-sm font-bold text-neutral-800'>
                        {heldPrize.prizeType === 'FREE_BAG' && 'You claimed a Free Selfie Wash Laundry Bag. Book an appointment to get it.'}
                        {heldPrize.prizeType === 'FREE_DISCOUNT' && '₱50 OFF will be applied to your next order.'}
                        {heldPrize.prizeType === 'FREE_SERVICE' && `You claimed a free ${heldPrize.selectedValue || 'service'}. Choose it when you book and it will be free.`}
                      </p>
                    </div>
                  )}

                  {!heldPrize && loyalty.loyaltyStamps >= 19 && (
                    <p className='font-sans text-xs text-blue-600 font-bold'>
                      19 stamps reached. Spin the Lucky Wheel below for your grand prize.
                    </p>
                  )}

                  {loyalty.loyaltyStamps < 19 && (() => {
                    const tiers = [
                      { name: '15th', available: loyalty.fifteenthAvailable, redeemedAt: loyalty.fifteenthStampRedeemedAt, label: '₱100 OFF' },
                      { name: '10th', available: loyalty.tenthAvailable,     redeemedAt: loyalty.tenthStampRedeemedAt,     label: '50% OFF' },
                      { name: '5th',  available: loyalty.fifthAvailable,      redeemedAt: loyalty.fifthStampRedeemedAt,      label: '10% OFF' },
                    ]
                    const active = tiers.find(t => t.available && !t.redeemedAt)
                    if (active) {
                      return (
                        <p className='font-sans text-xs text-blue-600 font-bold'>
                          {active.name} stamp reward unlocked — {active.label}. Check your promo codes at checkout.
                        </p>
                      )
                    }

                    const claimed = tiers.find(t => t.redeemedAt)
                    const stamps = loyalty.loyaltyStamps || 0
                    const next = stamps < 4 ? 4 : stamps < 9 ? 9 : stamps < 14 ? 14 : 19
                    return (
                      <div className='space-y-1'>
                        {claimed && (
                          <p className='font-sans text-xs text-neutral-400 italic'>
                            You've already claimed your {claimed.name} stamp reward this cycle.
                          </p>
                        )}
                        {next && (
                          <p className='font-sans text-xs text-neutral-400'>
                            {next - stamps} more completed order{next - stamps === 1 ? '' : 's'} until {next === 19 ? 'the Lucky Wheel unlocks' : 'your next reward unlocks'}.
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <p className='font-sans text-xs text-neutral-300'>Loading...</p>
              )}
            </section>

            {loyalty && loyalty.loyaltyStamps >= 19 && !heldPrize && (
              <section>
                <div className='flex items-center gap-4 mb-6'>
                  <span className='uppercase tracking-[0.3em] text-[10px] text-blue-500 font-sans font-black whitespace-nowrap'>
                    Lucky Wheel
                  </span>
                  <div className='h-px bg-blue-100 w-full' />
                </div>

                <div className='bg-blue-50 border-2 border-blue-200 p-8 text-center'>
                  <p className='font-sans text-sm text-neutral-700 mb-2'>
                    Congratulations! You've earned <span className='font-black text-blue-600'>{loyalty.loyaltyStamps} loyalty stamps</span>.
                  </p>
                  <p className='font-sans text-xs text-neutral-500 mb-6'>
                    You have one Lucky Wheel spin available. Open the wheel to claim your prize.
                  </p>
                  <button
                    onClick={() => setShowWheelModal(true)}
                    className='group relative overflow-hidden px-8 py-3 font-sans text-[11px] tracking-[0.2em] uppercase font-black bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                  >
                    <span className='relative z-10'>Open Lucky Wheel</span>
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {showWheelModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4'
          style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
          onClick={closeWheelModal}
        >
          <div
            className='relative bg-white border-2 border-blue-200 max-w-lg w-full p-8'
            style={{
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
              animation: 'modalIn 0.3s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeWheelModal}
              disabled={spinning}
              className='absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-sans text-lg font-black'
              aria-label='Close'
            >
              ✕
            </button>

            <div className='text-center mb-6'>
              <span className='uppercase tracking-[0.3em] text-[10px] text-blue-500 font-sans font-black block mb-2'>
                Lucky Wheel
              </span>
              <h2
                className='leading-none text-blue-900 mb-2'
                style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em' }}
              >
                Spin and Win
              </h2>
              <p className='font-sans text-xs text-neutral-500'>
                {spinResult
                  ? 'Congratulations on your prize.'
                  : 'One spin available. Good luck.'}
              </p>
            </div>

            <div className='flex justify-center mb-6'>
              <div className='relative w-56 h-56'>
                <div
                  className='absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20'
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '20px solid #2563eb',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
                  }}
                />

                <div
                  ref={wheelRef}
                  className='w-full h-full rounded-full border-4 border-blue-300 shadow-xl overflow-hidden'
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full block">
                    {WHEEL_PRIZES.map((prize, i) => {
                      const startAngle = i * SEGMENT_ANGLE
                      const endAngle = startAngle + SEGMENT_ANGLE
                      const midAngle = startAngle + SEGMENT_ANGLE / 2
                      const labelPos = polarToCartesian(100, 100, 65, midAngle)
                      return (
                        <g key={i}>
                          <path
                            d={describeArc(100, 100, 100, startAngle, endAngle)}
                            fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                            stroke="#ffffff"
                            strokeWidth="0.75"
                          />
                          <text
                            x={labelPos.x}
                            y={labelPos.y}
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="900"
                            fontFamily="ui-sans-serif, system-ui, sans-serif"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${midAngle} ${labelPos.x} ${labelPos.y})`}
                          >
                            {prize.label}
                          </text>
                        </g>
                      )
                    })}
                    <circle cx="100" cy="100" r="18" fill="#ffffff" stroke="#60a5fa" strokeWidth="3" />
                    <text
                      x="100"
                      y="100"
                      fill="#2563eb"
                      fontSize="16"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      ★
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {spinResult && (
              <div className='mb-5 p-4 bg-blue-100 border border-blue-300 text-center'>
                <p className='font-sans text-sm font-black text-blue-700'>
                  You won: {spinResult.prizeType.replace(/_/g, ' ')}
                </p>
              </div>
            )}

            <div className='flex flex-col gap-3'>
              {!spinResult ? (
                <button
                  onClick={handleSpin}
                  disabled={spinning}
                  className='group relative overflow-hidden w-full py-3.5 font-sans text-[11px] tracking-[0.2em] uppercase font-black bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <span className='relative z-10'>{spinning ? 'SPINNING...' : 'SPIN THE WHEEL'}</span>
                </button>
              ) : (
                <button
                  onClick={closeWheelModal}
                  className='w-full py-3.5 font-sans text-[11px] tracking-[0.2em] uppercase font-black bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  Claim Prize
                </button>
              )}

              {!spinResult && (
                <button
                  onClick={closeWheelModal}
                  disabled={spinning}
                  className='w-full py-3 font-sans text-[10px] tracking-[0.2em] uppercase font-bold border border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed'
                >
                  Maybe Later
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default MyProfiles