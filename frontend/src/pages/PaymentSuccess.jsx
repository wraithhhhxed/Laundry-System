import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')

  useEffect(() => {
    const verify = async () => {
      const appointmentId = searchParams.get('appointmentId')
      if (!appointmentId) { setStatus('failed'); return }

      const token      = localStorage.getItem('token')
      const backendUrl = import.meta.env.VITE_BACKEND_URL

      const attempt = async () => {
        const { data } = await axios.post(
          `${backendUrl}/api/user/verify-payment`,
          { appointmentId },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        return data
      }

      try {
        const data = await attempt()
        if (data.success && data.data.paid) {
          setStatus('success')
          toast.success('Payment confirmed!')
          setTimeout(() => { window.location.href = '/my-appointments' }, 2500)
        } else {
          setTimeout(async () => {
            try {
              const retryData = await attempt()
              if (retryData.success && retryData.data.paid) {
                setStatus('success')
                toast.success('Payment confirmed!')
                setTimeout(() => { window.location.href = '/my-appointments' }, 2500)
              } else {
                setStatus('failed')
              }
            } catch { setStatus('failed') }
          }, 3000)
        }
      } catch (error) {
        console.error(error)
        setStatus('failed')
      }
    }

    verify()
  }, [])

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='min-h-screen bg-white flex items-center justify-center px-6'>
      <div className='w-full max-w-sm'>

        {/* ── VERIFYING ── */}
        {status === 'verifying' && (
          <div>
            <span className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans block mb-3'>
              Please wait
            </span>
            <div className='h-px bg-blue-100 mb-8' />

            {/* spinner */}
            <div className='mb-8'>
              <div className='w-10 h-10 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin' />
            </div>

            <h1
              className='leading-none text-blue-900 mb-3'
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              Verifying Payment.
            </h1>
            <p className='font-sans text-sm text-neutral-400'>
              Hang tight while we confirm your transaction…
            </p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {status === 'success' && (
          <div>
            <span className='uppercase tracking-[0.35em] text-[10px] text-green-500 font-sans block mb-3'>
              Confirmed
            </span>
            <div className='h-px bg-green-100 mb-8' />

            {/* icon */}
            <div
              className='w-14 h-14 bg-green-50 border border-green-200 flex items-center justify-center mb-8'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6 text-green-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
              </svg>
            </div>

            <h1
              className='leading-none text-blue-900 mb-3'
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              Payment Successful.
            </h1>
            <p className='font-sans text-sm text-neutral-400'>
              Redirecting you to your appointments…
            </p>

            <div className='mt-8 h-px bg-blue-100' />
            <p className='font-sans text-[10px] uppercase tracking-[0.35em] text-blue-300 mt-4'>
              Selfie Wash · Thank you
            </p>
          </div>
        )}

        {/* ── FAILED ── */}
        {status === 'failed' && (
          <div>
            <span className='uppercase tracking-[0.35em] text-[10px] text-red-400 font-sans block mb-3'>
              Not Confirmed
            </span>
            <div className='h-px bg-red-100 mb-8' />

            {/* icon */}
            <div
              className='w-14 h-14 bg-red-50 border border-red-200 flex items-center justify-center mb-8'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              <svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6 text-red-400' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </div>

            <h1
              className='leading-none text-blue-900 mb-3'
              style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em' }}
            >
              Payment Not Confirmed.
            </h1>
            <p className='font-sans text-sm text-neutral-400 mb-8'>
              Your payment may still be processing. Check your appointments to confirm.
            </p>

            <button
              onClick={() => { window.location.href = '/my-appointments' }}
              className='group relative overflow-hidden bg-blue-600 text-white px-8 py-3 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3'
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              <span className='relative z-10'>Go to My Appointments</span>
              <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>
              <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default PaymentSuccess