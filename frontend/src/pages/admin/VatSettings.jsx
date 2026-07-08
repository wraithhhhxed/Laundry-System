import { useState, useEffect, useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'

const VatSettings = () => {
  const { getVatRate, updateVatRate } = useContext(AdminContext)

  const [vatRate, setVatRate]       = useState(null)   // stored as percentage (e.g. 12)
  const [fetching, setFetching]     = useState(true)
  const [inputVal, setInputVal]     = useState('')      // what admin types
  const [editing, setEditing]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    const fetchRate = async () => {
      const rate = await getVatRate()
      if (rate !== undefined) {
        setVatRate(rate * 100)
        setInputVal((rate * 100).toString())
      }
      setFetching(false)
    }
    fetchRate()
  }, [])

  const handleEditClick = () => {
    setInputVal(vatRate !== null ? vatRate.toString() : '')
    setError('')
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setError('')
  }

  const handleSaveClick = () => {
    const parsed = parseFloat(inputVal)
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError('Enter a valid percentage between 0 and 100 (e.g. 12 for 12%).')
      return
    }
    setError('')
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setSaving(true)
    const parsed = parseFloat(inputVal)
    // backend expects decimal (0.12 for 12%)
    const success = await updateVatRate(parsed / 100)
    setSaving(false)
    setShowConfirm(false)
    if (success) {
      setVatRate(parsed)
      setEditing(false)
    }
  }

  if (fetching) {
    return (
      <div className='bg-neutral-50 min-h-screen w-full flex items-center justify-center'
        style={{ fontFamily: "'Georgia', serif" }}>
        <span className='font-sans text-sm text-neutral-300 uppercase tracking-[0.2em]'>
          Loading…
        </span>
      </div>
    )
  }

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>

      {/* ── Header ── */}
      <div
        className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>
          Settings
        </p>
        <h1
          className='font-sans font-black text-white'
          style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}
        >
          VAT Settings
        </h1>
      </div>

      <div className='px-7 pb-10'>



        {/* ── Main card ── */}
        <div className='bg-white border border-violet-100 overflow-hidden mb-6'>

          <div className='bg-violet-50 px-7 py-3 border-b border-violet-100 flex items-center justify-between'>
            <span className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
              Current VAT Rate
            </span>
            {!editing && (
              <button
                onClick={handleEditClick}
                className='font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-violet-500 hover:text-violet-700 transition-colors'
              >
                Edit ✎
              </button>
            )}
          </div>

          <div className='px-7 py-6'>
            {!editing ? (
              /* ── Read mode ── */
              <div className='flex items-end gap-2'>
                <span className='font-sans font-black text-neutral-700' style={{ fontSize: '2.5rem', letterSpacing: '-0.04em' }}>
                  {vatRate !== null ? vatRate : '—'}
                </span>
                <span className='font-sans font-black text-violet-400 text-2xl pb-1'>%</span>
              </div>
            ) : (
              /* ── Edit mode ── */
              <div className='flex flex-col gap-3 max-w-xs'>
                <label className='font-sans text-xs text-neutral-500 uppercase tracking-[0.2em]'>
                  New VAT Rate (%)
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    min='0'
                    max='100'
                    step='0.01'
                    value={inputVal}
                    onChange={e => { setInputVal(e.target.value); setError('') }}
                    className='w-32 px-4 py-2 border border-violet-200 font-sans text-lg font-bold text-neutral-700 focus:outline-none focus:border-violet-500 transition-colors'
                    placeholder='e.g. 12'
                  />
                  <span className='font-sans font-bold text-violet-400 text-lg'>%</span>
                </div>
                {error && (
                  <p className='font-sans text-xs text-red-500'>{error}</p>
                )}
                <div className='flex items-center gap-3 mt-1'>
                  <button
                    onClick={handleSaveClick}
                    className='bg-violet-600 hover:bg-violet-700 text-white font-sans text-xs uppercase tracking-[0.2em] font-bold px-5 py-2.5 transition-colors'
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className='font-sans text-xs uppercase tracking-[0.2em] font-bold text-neutral-400 hover:text-neutral-600 transition-colors'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {!editing && (
            <div className='px-7 pb-5'>
              <p className='font-sans text-xs text-neutral-400'>
                Enter as a percentage (e.g. <strong>12</strong> for 12%). Only affects new bookings.
              </p>
            </div>
          )}
        </div>

        {/* ── Applied rate chip ── */}
        {vatRate !== null && (
          <div>
            <p className='uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans font-semibold mb-2'>
              Applied Rate
            </p>
            <div className='h-px bg-violet-100 mb-4' />
            <div className='flex flex-wrap gap-3'>
              <div
                className='bg-violet-600 px-6 py-4 min-w-[120px] text-center'
                style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #7c3aed' }}
              >
                <p className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-200 mb-1'>
                  VAT
                </p>
                <p className='font-sans font-black text-white text-lg' style={{ letterSpacing: '-0.02em' }}>
                  {vatRate}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {showConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='bg-white border border-violet-100 shadow-xl w-full max-w-sm mx-4' style={{ fontFamily: "'Georgia', serif" }}>

            <div className='bg-violet-600 px-6 py-4'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
              <p className='font-sans font-black text-white text-base' style={{ letterSpacing: '-0.02em' }}>
                Confirm VAT Change
              </p>
            </div>

            <div className='px-6 py-5 flex flex-col gap-4'>
              <p className='font-sans text-sm text-neutral-600 leading-relaxed'>
                You are changing the VAT rate from{' '}
                <strong className='text-violet-700'>{vatRate}%</strong> to{' '}
                <strong className='text-violet-700'>{parseFloat(inputVal)}%</strong>.
              </p>
              <div className='border border-amber-200 bg-amber-50 px-4 py-3'>
                <p className='font-sans text-xs text-amber-700 leading-relaxed'>
                  This will apply to all <strong>new bookings only</strong>. Existing appointments are not affected.
                </p>
              </div>
              <div className='flex gap-3 pt-1'>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className='flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-sans text-xs uppercase tracking-[0.2em] font-bold py-2.5 transition-colors'
                >
                  {saving ? 'Saving…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                  className='flex-1 border border-violet-200 text-violet-500 hover:bg-violet-50 font-sans text-xs uppercase tracking-[0.2em] font-bold py-2.5 transition-colors'
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VatSettings