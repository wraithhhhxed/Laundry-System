import { useEffect, useContext, useState, useMemo, useCallback, useRef } from 'react'
import { BranchesContext } from '../../context/BranchesContext'

const DELIVERY_STEPS = [
  { status: 'pending_approval',  label: 'Pending Approval' },
  { status: 'approved',          label: 'Approved' },
  { status: 'picked_up',         label: 'Picked Up' },
  { status: 'in_progress',       label: 'On Process' },
  { status: 'out_for_delivery',  label: 'Out for Delivery' },
  { status: 'delivered',         label: 'Delivered' },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all',              label: 'All Statuses' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved',         label: 'Approved' },
  { value: 'picked_up',        label: 'Picked Up' },
  { value: 'in_progress',      label: 'On Process' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'cancelled',        label: 'Cancelled' },
]

const STATUS_CHIP = {
  pending_approval: 'text-amber-600 border-amber-300 bg-amber-50',
  approved:         'text-blue-600 border-blue-300 bg-blue-50',
  picked_up:        'text-indigo-600 border-indigo-300 bg-indigo-50',
  in_progress:      'text-violet-600 border-violet-300 bg-violet-50',
  out_for_delivery: 'text-purple-600 border-purple-300 bg-purple-50',
  delivered:        'text-green-600 border-green-300 bg-green-50',
  cancelled:        'text-red-500 border-red-300 bg-red-50',
}

const PAYMENT_STATUS_CHIP = {
  unpaid:          'text-neutral-400 border-neutral-200 bg-neutral-50',
  pending_payment: 'text-amber-600 border-amber-300 bg-amber-50',
  paid_cash:       'text-green-600 border-green-300 bg-green-50',
  paid_online:     'text-blue-600 border-blue-300 bg-blue-50',
}

const PAYMENT_STATUS_LABEL = {
  unpaid:          'Unpaid',
  pending_payment: 'Awaiting Payment',
  paid_cash:       'Paid (Cash)',
  paid_online:     'Paid (Online)',
}

const PAGE_SIZE             = 4
const AUTO_REFRESH_INTERVAL = 30

const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const getNextStatus = (current) => {
  const idx = DELIVERY_STEPS.findIndex(s => s.status === current)
  if (idx === -1 || idx === DELIVERY_STEPS.length - 1) return null
  return DELIVERY_STEPS[idx + 1]
}

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans mb-2">{children}</p>
)
const Divider = () => <div className="h-px bg-violet-100 mb-6" />

const StatusChip = ({ status }) => {
  const color = STATUS_CHIP[status] || 'text-neutral-500 border-neutral-200 bg-neutral-50'
  const label = DELIVERY_STEPS.find(s => s.status === status)?.label || status
  return (
    <span className={`inline-block border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold ${color}`}>
      {label}
    </span>
  )
}

const renderServices = (appt) => {
  if (Array.isArray(appt.services) && appt.services.length > 0)
    return appt.services.map(s => s.name ?? s).join(', ')
  return '—'
}

// ─── RECEIPT MODAL ────────────────────────────────────────────────
const ReceiptModal = ({ appt, onClose, onConfirm, loading }) => {
  const [printed, setPrinted] = useState(false)

  const hasActual   = appt.actualFinalAmount != null
  const estimated   = appt.finalAmount ?? appt.totalAmount ?? 0
  const finalAmt    = appt.actualFinalAmount ?? estimated
  const payStatus   = appt.paymentStatus || (appt.payment ? 'paid_cash' : 'unpaid')
  const isPaid      = appt.payment || payStatus === 'paid_cash' || payStatus === 'paid_online'
  const vatPercent  = Math.round((appt.vatRate ?? 0) * 100)
  const now         = new Date()
  const receiptDate = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  const receiptTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=700')
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt — ${appt.userData?.name || 'Client'}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:12px;color:#111;background:#fff;padding:20px;max-width:320px;margin:0 auto}
      .center{text-align:center}.bold{font-weight:bold}.large{font-size:16px}
      .xlarge{font-size:20px;font-weight:900;letter-spacing:-0.5px}.small{font-size:10px;color:#555}
      .divider{border-top:1px dashed #999;margin:10px 0}.row{display:flex;justify-content:space-between;margin:3px 0}
      .label{color:#555}.total{font-size:15px;font-weight:900}
      .chip{display:inline-block;border:1px solid;padding:2px 8px;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase}
      .paid{border-color:#16a34a;color:#16a34a}.pending{border-color:#d97706;color:#d97706}
      .tag{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888}
      .mt4{margin-top:12px}.mb4{margin-bottom:12px}.strike{text-decoration:line-through;color:#999}
    </style></head><body>
    <div class="center mb4">
      <div class="tag">Branch Portal</div>
      <div class="xlarge">SELFIE WASH</div>
      <div class="small">Official Service Receipt</div>
      <div class="divider"></div>
      <div class="small">${receiptDate} · ${receiptTime}</div>
    </div>
    <div class="mb4">
      <div class="tag">Client</div>
      <div class="bold large">${appt.userData?.name || '—'}</div>
      <div class="small">${appt.userData?.email || ''}</div>
    </div>
    <div class="divider"></div>
    <div class="mb4 mt4">
      <div class="tag">Schedule</div>
      <div>${appt.slotDate} · ${appt.slotTime}</div>
    </div>
    <div class="divider"></div>
    <div class="mb4 mt4">
      <div class="tag">Services</div>
      ${(appt.services || []).map((svc, i) => `
        <div class="row" style="margin-top:6px"><span class="bold">Basket ${i + 1} — ${svc.name}</span></div>
        <div class="row"><span class="label">Est. weight</span><span>${svc.kg}kg</span></div>
        ${svc.actualKg != null ? `<div class="row"><span class="label">Actual weight</span><span class="bold">${svc.actualKg}kg</span></div>` : ''}
        ${svc.overweightCharge > 0 ? `<div class="row"><span class="label">Overweight charge</span><span>${fmt(svc.overweightCharge)}</span></div>` : ''}
      `).join('')}
    </div>
    ${appt.addOns?.length > 0 ? `
    <div class="divider"></div>
    <div class="mb4 mt4">
      <div class="tag">Add-ons</div>
      ${appt.addOns.map(a => `<div class="row"><span>${a.name} ×${a.quantity}</span><span>${fmt(a.price * a.quantity)}</span></div>`).join('')}
    </div>` : ''}
    <div class="divider"></div>
    <div class="mb4 mt4">
      ${hasActual
        ? `<div class="row"><span class="label">Estimated</span><span class="strike">${fmt(estimated)}</span></div>
           ${appt.overweightChargeTotal > 0 ? `<div class="row"><span class="label">Overweight total</span><span>+${fmt(appt.overweightChargeTotal)}</span></div>` : ''}`
        : vatPercent > 0 ? `<div class="row"><span class="label">VAT (${vatPercent}%)</span><span>+${fmt(appt.vatAmount)}</span></div>` : ''
      }
      ${appt.discountAmount > 0 ? `<div class="row"><span class="label">Discount (${appt.promoCode || ''})</span><span>-${fmt(appt.discountAmount)}</span></div>` : ''}
      <div class="divider"></div>
      <div class="row total"><span>TOTAL</span><span>${fmt(finalAmt)}</span></div>
    </div>
    <div class="divider"></div>
    <div class="center mt4">
      <span class="chip ${isPaid ? 'paid' : 'pending'}">${PAYMENT_STATUS_LABEL[payStatus] || 'Unpaid'}</span>
      <div class="small" style="margin-top:6px">Payment: ${appt.preferredPaymentMethod === 'online' ? 'Online' : 'Cash'}</div>
    </div>
    <div class="divider" style="margin-top:20px"></div>
    <div class="center small" style="margin-top:8px">Thank you for choosing Selfie Wash!<br/>Please keep this receipt for your records.</div>
    </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
    setPrinted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-lg flex flex-col max-h-[90vh]"
        style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>

        <div className="px-6 py-5 flex-shrink-0"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>Print Receipt</h2>
              <p className="font-sans text-xs text-violet-300 mt-0.5">Print receipt before marking as Out for Delivery</p>
            </div>
            <button onClick={onClose} className="text-violet-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6">
          <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 font-mono text-xs text-neutral-800 max-w-xs mx-auto">
            <div className="text-center mb-4">
              <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-400">Branch Portal</p>
              <p className="font-black text-lg tracking-tight">SELFIE WASH</p>
              <p className="text-[9px] text-neutral-400">Official Service Receipt</p>
              <div className="border-t border-dashed border-neutral-300 mt-2 pt-2">
                <p className="text-[9px] text-neutral-400">{receiptDate} · {receiptTime}</p>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-0.5">Client</p>
              <p className="font-bold">{appt.userData?.name || '—'}</p>
              <p className="text-[9px] text-neutral-400">{appt.userData?.email || ''}</p>
            </div>
            <div className="border-t border-dashed border-neutral-300 my-3" />
            <div className="mb-3">
              <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-0.5">Schedule</p>
              <p>{appt.slotDate} · {appt.slotTime}</p>
            </div>
            <div className="border-t border-dashed border-neutral-300 my-3" />
            <div className="mb-3">
              <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Services</p>
              {(appt.services || []).map((svc, i) => (
                <div key={i} className="mb-2">
                  <p className="font-bold">Basket {i + 1} — {svc.name}</p>
                  <div className="flex justify-between text-[10px]"><span className="text-neutral-500">Est. weight</span><span>{svc.kg}kg</span></div>
                  {svc.actualKg != null && <div className="flex justify-between text-[10px]"><span className="text-neutral-500">Actual weight</span><span className="font-bold text-violet-700">{svc.actualKg}kg</span></div>}
                  {svc.overweightCharge > 0 && <div className="flex justify-between text-[10px]"><span className="text-neutral-500">Overweight charge</span><span className="text-amber-600">{fmt(svc.overweightCharge)}</span></div>}
                </div>
              ))}
            </div>
            {appt.addOns?.length > 0 && (
              <>
                <div className="border-t border-dashed border-neutral-300 my-3" />
                <div className="mb-3">
                  <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Add-ons</p>
                  {appt.addOns.map((a, i) => (
                    <div key={i} className="flex justify-between text-[10px]"><span>{a.name} ×{a.quantity}</span><span>{fmt(a.price * a.quantity)}</span></div>
                  ))}
                </div>
              </>
            )}
            <div className="border-t border-dashed border-neutral-300 my-3" />
            <div className="mb-3 space-y-1">
              {hasActual ? (
                <>
                  <div className="flex justify-between text-[10px]"><span className="text-neutral-500">Estimated</span><span className="line-through text-neutral-400">{fmt(estimated)}</span></div>
                  {appt.overweightChargeTotal > 0 && <div className="flex justify-between text-[10px]"><span className="text-neutral-500">Overweight total</span><span className="text-amber-600">+{fmt(appt.overweightChargeTotal)}</span></div>}
                </>
              ) : vatPercent > 0 && (
                <div className="flex justify-between text-[10px]"><span className="text-neutral-500">VAT ({vatPercent}%)</span><span>+{fmt(appt.vatAmount)}</span></div>
              )}
              {appt.discountAmount > 0 && <div className="flex justify-between text-[10px]"><span className="text-neutral-500">Discount {appt.promoCode && `(${appt.promoCode})`}</span><span className="text-green-600">-{fmt(appt.discountAmount)}</span></div>}
              <div className="border-t border-dashed border-neutral-300 pt-2 mt-1 flex justify-between font-black text-sm">
                <span>TOTAL</span><span className="text-violet-900">{fmt(finalAmt)}</span>
              </div>
            </div>
            <div className="border-t border-dashed border-neutral-300 my-3" />
            <div className="text-center">
              <span className={`inline-block border px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold ${PAYMENT_STATUS_CHIP[payStatus] || PAYMENT_STATUS_CHIP.unpaid}`}>
                {PAYMENT_STATUS_LABEL[payStatus] || 'Unpaid'}
              </span>
              <p className="text-[9px] text-neutral-400 mt-1">Payment: {appt.preferredPaymentMethod === 'online' ? 'Online' : 'Cash'}</p>
            </div>
            <div className="border-t border-dashed border-neutral-300 mt-4 pt-3 text-center">
              <p className="text-[9px] text-neutral-400">Thank you for choosing Selfie Wash!</p>
              <p className="text-[9px] text-neutral-400">Please keep this receipt for your records.</p>
            </div>
          </div>

          {printed && (
            <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2.5 max-w-xs mx-auto">
              <span className="text-green-600 text-sm">✓</span>
              <p className="font-sans text-xs text-green-700 font-semibold">Receipt printed — ready to proceed</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-4 pt-3 flex gap-3 flex-shrink-0 border-t border-violet-100">
          <button onClick={handlePrint}
            className="group relative overflow-hidden border border-violet-400 text-violet-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-2 flex-1 py-2.5"
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            <span className="relative">🖨 {printed ? 'Print Again' : 'Print Receipt'}</span>
          </button>
          <button onClick={onConfirm} disabled={!printed || loading}
            className={`group relative overflow-hidden font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center flex-1 py-2.5 disabled:cursor-not-allowed transition-colors ${printed ? 'bg-violet-600 text-white' : 'bg-neutral-200 text-neutral-400'}`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            {printed && <div className="absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />}
            <span className="relative">{loading ? 'Processing...' : '→ Out for Delivery'}</span>
          </button>
        </div>
        {!printed && (
          <p className="text-center font-sans text-[10px] text-neutral-400 pb-4">
            Print the receipt first to enable the Out for Delivery button
          </p>
        )}
      </div>
    </div>
  )
}

// ─── ACTUAL WEIGHT MODAL ──────────────────────────────────────────
const ActualWeightModal = ({ appt, onClose, onSubmit, loading }) => {
  const isEditing = appt.services.some(s => s.actualKg != null)
  const [actualKgs, setActualKgs] = useState(
    appt.services.map((s, i) => ({ serviceIndex: i, actualKg: s.actualKg ?? s.kg ?? '' }))
  )
  const handleChange = (idx, value) => setActualKgs(prev => prev.map((item, i) => i === idx ? { ...item, actualKg: value } : item))
  const handleSubmit = () => {
    for (const item of actualKgs) {
      if (!item.actualKg || Number(item.actualKg) < 1)
        return alert(`Please enter a valid weight for basket ${item.serviceIndex + 1}`)
    }
    onSubmit(actualKgs.map(item => ({ serviceIndex: item.serviceIndex, actualKg: Number(item.actualKg) })))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-lg" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="px-6 py-5" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>
                {isEditing ? 'Update Actual Weight' : 'Confirm Actual Weight'}
              </h2>
            </div>
            <button onClick={onClose} className="text-violet-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="font-sans text-xs text-neutral-400">
            {isEditing ? 'Update the actual weight to correct a previous entry. Final amount will be recomputed.' : 'Enter the actual weight after physically weighing each basket. Final amount will be recomputed.'}
          </p>
          {appt.services.map((svc, idx) => (
            <div key={idx} className="border border-violet-100 px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-sans text-xs font-bold text-violet-600 uppercase tracking-wider">Basket {idx + 1} — {svc.name}</p>
                  <p className="font-sans text-xs text-neutral-400 mt-0.5">Estimated: {svc.kg}kg ({fmt(svc.kgPrice)})</p>
                </div>
                {svc.actualKg != null && (
                  <span className="font-sans text-xs bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5">Current: {svc.actualKg}kg</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider flex-shrink-0">{svc.actualKg != null ? 'New KG' : 'Actual KG'}</label>
                <input type="number" min="1" step="0.1" value={actualKgs[idx]?.actualKg ?? ''} onChange={e => handleChange(idx, e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white"
                  placeholder={`e.g. ${svc.actualKg ?? svc.kg}`} />
                <span className="font-sans text-xs text-neutral-400 flex-shrink-0">kg</span>
              </div>
              {Number(actualKgs[idx]?.actualKg) > 7 && (
                <p className="font-sans text-xs text-amber-600 mt-1.5">⚠ Over 7kg — overweight charge of ₱20/kg applies for {(Number(actualKgs[idx].actualKg) - 7).toFixed(1)}kg extra</p>
              )}
            </div>
          ))}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-violet-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-violet-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : isEditing ? 'Update Weight' : 'Confirm Weight'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CASH PAYMENT MODAL ───────────────────────────────────────────
const CashPaymentModal = ({ appt, onClose, onSubmit, loading }) => {
  const finalAmt = appt.actualFinalAmount ?? appt.finalAmount ?? appt.totalAmount ?? 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-md" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="px-6 py-5" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>Confirm Cash Payment</h2>
            </div>
            <button onClick={onClose} className="text-violet-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="bg-violet-50 border border-violet-100 px-5 py-4 flex items-center justify-between">
            <span className="font-sans text-xs uppercase tracking-widest text-neutral-500">Amount Collected</span>
            <span className="font-sans font-black text-violet-700 text-xl" style={{ letterSpacing: '-0.02em' }}>{fmt(finalAmt)}</span>
          </div>
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-xl"></span>
            <div>
              <p className="font-sans text-sm font-bold text-green-700">Cash Payment</p>
              <p className="font-sans text-xs text-green-600">Confirm that you have collected {fmt(finalAmt)} in cash from the client.</p>
            </div>
          </div>
          <p className="font-sans text-xs text-neutral-400">
            Client: <span className="text-neutral-600 font-semibold">{appt.userData?.name}</span>
            {appt.promoCode && <span className="ml-2 text-green-600">· Promo: {appt.promoCode}</span>}
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-violet-50 transition-colors">Cancel</button>
          <button onClick={() => onSubmit('cash')} disabled={loading} className="flex-1 bg-green-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-green-700 transition-colors disabled:opacity-50">
            {loading ? 'Processing...' : '✓ Confirm Cash Received'}
          </button>
        </div>
      </div>
    </div>
  )
}

const renderAmount = (appt) => {
  const hasActual  = appt.actualFinalAmount != null
  const estimated  = appt.finalAmount ?? appt.totalAmount ?? 0
  const actual     = appt.actualFinalAmount ?? estimated
  const vatPercent = Math.round((appt.vatRate ?? 0) * 100)
  return (
    <div className="space-y-1">
      {hasActual ? (
        <>
          <p className="font-sans text-[10px] text-neutral-400 uppercase tracking-wider">Estimated</p>
          <p className="font-sans text-xs text-neutral-400 line-through">{fmt(estimated)}</p>
          <p className="font-sans text-[10px] text-violet-500 uppercase tracking-wider mt-1">Actual</p>
          <p className="font-sans text-sm font-bold text-violet-900">{fmt(actual)}</p>
          {appt.overweightChargeTotal > 0 && <p className="font-sans text-xs text-amber-600">Overweight: +{fmt(appt.overweightChargeTotal)}</p>}
        </>
      ) : (
        <>
          {vatPercent > 0 && <p className="font-sans text-xs text-neutral-400">VAT ({vatPercent}%): +{fmt(appt.vatAmount)}</p>}
          <p className="font-sans text-sm font-bold text-violet-900">{fmt(estimated)}<span className="font-sans text-[10px] font-normal text-neutral-400 ml-1">(est.)</span></p>
        </>
      )}
    </div>
  )
}

const renderWeight = (appt) => {
  if (!Array.isArray(appt.services) || appt.services.length === 0) return null
  return (
    <div className="space-y-1">
      {appt.services.map((svc, idx) => (
        <div key={idx} className="flex items-center gap-2 font-sans text-xs">
          <span className="text-neutral-500">{svc.name}:</span>
          {svc.actualKg != null ? (
            <>
              <span className="text-neutral-400 line-through">{svc.kg}kg</span>
              <span className="text-violet-700 font-bold">{svc.actualKg}kg</span>
              {svc.overweightCharge > 0 && <span className="text-amber-600 text-[10px]">+OW</span>}
            </>
          ) : (
            <span className="text-neutral-600">{svc.kg}kg <span className="text-neutral-400">(est.)</span></span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
const BranchAppointments = () => {
  const {
    bToken, appointments, getBranchAppointments,
    cancelAppointment, updateDeliveryStatus,
    confirmActualWeight, confirmPayment,
  } = useContext(BranchesContext)

  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [currentPage,   setCurrentPage]   = useState(1)
  const [weightModal,   setWeightModal]   = useState(null)
  const [paymentModal,  setPaymentModal]  = useState(null)
  const [receiptModal,  setReceiptModal]  = useState(null)
  const [modalLoading,  setModalLoading]  = useState(false)
  const [lastUpdated,   setLastUpdated]   = useState(null)
  const [secondsAgo,    setSecondsAgo]    = useState(0)
  const [isRefreshing,  setIsRefreshing]  = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    await getBranchAppointments()
    setLastUpdated(new Date())
    setSecondsAgo(0)
    setIsRefreshing(false)
  }, [getBranchAppointments])

  useEffect(() => { if (bToken) refresh() }, [bToken])
  useEffect(() => {
    if (!bToken) return
    const interval = setInterval(refresh, AUTO_REFRESH_INTERVAL * 1000)
    return () => clearInterval(interval)
  }, [bToken, refresh])
  useEffect(() => {
    if (!lastUpdated) return
    const tick = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)), 1000)
    return () => clearInterval(tick)
  }, [lastUpdated])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, paymentFilter])

  const filtered = useMemo(() => appointments.filter(appt => {
    if (statusFilter === 'cancelled' && !appt.cancelled) return false
    if (statusFilter !== 'all' && statusFilter !== 'cancelled') {
      if (appt.cancelled) return false
      if (appt.deliveryStatus !== statusFilter) return false
    }
    if (paymentFilter === 'paid'   && !appt.payment) return false
    if (paymentFilter === 'unpaid' &&  appt.payment) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name  = appt.userData?.name?.toLowerCase()  || ''
      const email = appt.userData?.email?.toLowerCase() || ''
      const svcs  = renderServices(appt).toLowerCase()
      const promo = appt.promoCode?.toLowerCase()        || ''
      const date  = appt.slotDate?.toLowerCase()         || ''
      if (![name, email, svcs, promo, date].some(f => f.includes(q))) return false
    }
    return true
  }), [appointments, search, statusFilter, paymentFilter])

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated    = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setPaymentFilter('all') }
  const hasFilters   = search || statusFilter !== 'all' || paymentFilter !== 'all'

  const handleConfirmWeight  = async (actualServices) => {
    setModalLoading(true)
    const ok = await confirmActualWeight(weightModal._id, actualServices)
    setModalLoading(false)
    if (ok) setWeightModal(null)
  }
  const handleConfirmPayment = async (method) => {
    setModalLoading(true)
    const ok = await confirmPayment(paymentModal._id, method)
    setModalLoading(false)
    if (ok) setPaymentModal(null)
  }
  const handleReceiptConfirm = async () => {
    setModalLoading(true)
    await updateDeliveryStatus(receiptModal._id, 'out_for_delivery')
    setModalLoading(false)
    setReceiptModal(null)
  }

  const selectClass = "px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white appearance-none cursor-pointer"
  const getPageRange = () => {
    const delta = 2, left = Math.max(1, currentPage - delta), right = Math.min(totalPages, currentPage + delta)
    const range = []; for (let i = left; i <= right; i++) range.push(i); return range
  }
  const lastUpdatedLabel = lastUpdated
    ? secondsAgo < 5 ? 'Just now' : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`
    : '—'

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-white">

      {weightModal  && <ActualWeightModal appt={weightModal}  onClose={() => setWeightModal(null)}  onSubmit={handleConfirmWeight}  loading={modalLoading} />}
      {paymentModal && <CashPaymentModal  appt={paymentModal} onClose={() => setPaymentModal(null)} onSubmit={handleConfirmPayment} loading={modalLoading} />}
      {receiptModal && <ReceiptModal      appt={receiptModal} onClose={() => setReceiptModal(null)} onConfirm={handleReceiptConfirm} loading={modalLoading} />}

      {/* Header */}
      <div className="px-10 pt-10 pb-12" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-3">Branch Portal</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white" style={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>Appointments</h1>
            <p className="font-sans text-sm text-violet-300 mt-2">Manage and update your branch appointments</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="font-sans text-[10px] uppercase tracking-widest text-violet-300">Last updated</p>
              <p className="font-sans text-xs text-white font-semibold">{lastUpdatedLabel}</p>
            </div>
            <button onClick={refresh} disabled={isRefreshing}
              className="group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              <span className={`relative z-10 inline-block ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
              <span className="relative z-10">{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-10 py-10 max-w-7xl mx-auto">
        <SectionLabel>Filter Appointments</SectionLabel>
        <Divider />
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, service, promo, date..."
              className="w-full pl-10 pr-8 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500 text-lg leading-none">×</button>}
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
            {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className={selectClass}>
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-8">
          <p className="font-sans text-xs text-neutral-400">
            Showing <span className="text-violet-600 font-semibold">{filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of <span className="text-violet-600 font-semibold">{filtered.length}</span> appointment{filtered.length !== 1 ? 's' : ''}
          </p>
          {hasFilters && <button onClick={clearFilters} className="font-sans text-xs uppercase tracking-[0.2em] text-violet-400 hover:text-violet-600 transition-colors">Clear Filters ×</button>}
        </div>

        {filtered.length === 0 && (
          <div className="border border-violet-100 px-7 py-16 flex flex-col items-center gap-3">
            <p className="font-sans text-sm text-neutral-300 uppercase tracking-widest">{appointments.length === 0 ? 'No appointments found' : 'No appointments match your filters'}</p>
            {hasFilters && <button onClick={clearFilters} className="font-sans text-xs uppercase tracking-[0.2em] text-violet-400 hover:text-violet-600 transition-colors">Clear Filters →</button>}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-violet-100">
          {paginated.map((appt) => {
            const isCancelled    = appt.cancelled
            const isCompleted    = appt.isCompleted
            const nextStatus     = getNextStatus(appt.deliveryStatus || 'pending_approval')
            const showButtons    = !isCancelled && !isCompleted
            const payStatus      = appt.paymentStatus || (appt.payment ? 'paid_cash' : 'unpaid')
            const isWeighed      = appt.services?.some(s => s.actualKg != null)
            const isPaid         = appt.payment || payStatus === 'paid_cash' || payStatus === 'paid_online'
            const isCashMethod   = appt.preferredPaymentMethod === 'cash' || !appt.preferredPaymentMethod
            const isOnlineMethod = appt.preferredPaymentMethod === 'online'

            // ── FIX 1: canWeigh — hide weight button once paid (cash or online) ──
            const canWeigh = !isCancelled && !isCompleted && appt.deliveryStatus === 'in_progress' && !isPaid

            // Cash confirm: ONLY at out_for_delivery
            const canConfirmCash = !isCancelled && !isPaid && isCashMethod && appt.deliveryStatus === 'out_for_delivery'

            // ── FIX 2: block advance to out_for_delivery if online & unpaid ──
            const blockedByOnlinePayment = isOnlineMethod && !isPaid
              && nextStatus?.status === 'out_for_delivery'

            const handleNextStatus = () => {
              if (!nextStatus) return
              if (blockedByOnlinePayment) return
              nextStatus.status === 'out_for_delivery' ? setReceiptModal(appt) : updateDeliveryStatus(appt._id, nextStatus.status)
            }

            return (
              <div key={appt._id} className="bg-white px-7 py-8 flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {appt.userData?.image
                      ? <img src={appt.userData.image} className="w-10 h-10 object-cover flex-shrink-0" alt="" />
                      : <div className="w-10 h-10 bg-violet-600 flex items-center justify-center flex-shrink-0 text-white font-bold font-sans text-sm">{appt.userData?.name?.[0]?.toUpperCase() || '?'}</div>
                    }
                    <div>
                      <p className="text-violet-900 font-bold text-sm" style={{ letterSpacing: '-0.01em' }}>{appt.userData?.name || '—'}</p>
                      <p className="font-sans text-xs text-neutral-400">{appt.userData?.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-block border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold ${PAYMENT_STATUS_CHIP[payStatus] || PAYMENT_STATUS_CHIP.unpaid}`}>
                      {PAYMENT_STATUS_LABEL[payStatus] || 'Unpaid'}
                    </span>
                    <span className="font-sans text-[10px] text-neutral-400">{isOnlineMethod ? 'Online' : 'Cash'}</span>
                  </div>
                </div>

                <div className="h-px bg-violet-100" />

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div><SectionLabel>Service</SectionLabel><p className="font-sans text-sm text-neutral-700">{renderServices(appt)}</p></div>
                  <div>
                    <SectionLabel>Schedule</SectionLabel>
                    <p className="font-sans text-sm text-neutral-700">{appt.slotDate}</p>
                    <p className="font-sans text-xs text-neutral-400">{appt.slotTime}</p>
                  </div>
                  <div><SectionLabel>Amount</SectionLabel>{renderAmount(appt)}</div>
                  <div><SectionLabel>Weight</SectionLabel>{renderWeight(appt) || <p className="font-sans text-sm text-neutral-400">—</p>}</div>
                  {appt.specialInstructions && (
                    <div className="col-span-2"><SectionLabel>Notes</SectionLabel><p className="font-sans text-sm text-neutral-500 italic">"{appt.specialInstructions}"</p></div>
                  )}
                  {appt.pickupAddress?.line1 && (
                    <div className="col-span-2">
                      <SectionLabel>Pickup Address</SectionLabel>
                      <p className="font-sans text-sm text-neutral-700">{appt.pickupAddress.line1}{appt.pickupAddress.line2 ? ', ' + appt.pickupAddress.line2 : ''}</p>
                    </div>
                  )}



                  {/* Online waiting note — already out_for_delivery but still unpaid */}
                  {isOnlineMethod && !isPaid && appt.deliveryStatus === 'out_for_delivery' && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 px-3 py-2">
                      <p className="font-sans text-xs text-blue-600">Client will pay online. Waiting for online payment confirmation.</p>
                    </div>
                  )}

 
                </div>

                <div className="h-px bg-violet-100" />

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {isCancelled
                      ? <span className="inline-block border border-red-300 bg-red-50 text-red-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold">Cancelled</span>
                      : <StatusChip status={appt.deliveryStatus || 'pending_approval'} />
                    }
                    {isWeighed && !isPaid && appt.deliveryStatus === 'in_progress' && (
                      <span className="inline-block border border-amber-300 bg-amber-50 text-amber-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold">Weight Confirmed</span>
                    )}
                  </div>

                  {showButtons && (
                    <div className="flex flex-wrap gap-2">
                      {appt.deliveryStatus === 'pending_approval' && (
                        <>
                          <button onClick={() => updateDeliveryStatus(appt._id, 'approved')}
                            className="group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                            <div className="absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                            <span className="relative">Approve</span>
                          </button>
                          <button onClick={() => cancelAppointment(appt._id)}
                            className="group relative overflow-hidden border border-violet-200 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                            <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                            <span className="relative">Cancel</span>
                          </button>
                        </>
                      )}

                      {/* Advance — hidden when blocked by online payment */}
                      {appt.deliveryStatus !== 'pending_approval' && nextStatus && !blockedByOnlinePayment && (
                        <button onClick={handleNextStatus}
                          className="group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                          <div className="absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                          <span className="relative">{nextStatus.status === 'out_for_delivery' ? '🖨 Print & ' : '→ '}{nextStatus.label}</span>
                        </button>
                      )}

                      {/* Confirm Weight — in_progress + unpaid ONLY */}
                      {canWeigh && (
                        <button onClick={() => setWeightModal(appt)}
                          className="group relative overflow-hidden border border-violet-400 text-violet-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                          <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                          <span className="relative">⚖ {isWeighed ? 'Update Weight' : 'Confirm Weight'}</span>
                        </button>
                      )}

                      {/*  Confirm Cash — out_for_delivery ONLY */}
                      {canConfirmCash && (
                        <button onClick={() => setPaymentModal(appt)}
                          className="group relative overflow-hidden bg-green-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                          <div className="absolute inset-0 bg-green-700 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                          <span className="relative">Confirm Payment</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
            <p className="font-sans text-xs text-neutral-400 uppercase tracking-[0.2em]">Page <span className="text-violet-600 font-semibold">{currentPage}</span> of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                <span className="relative">← Prev</span>
              </button>
              {getPageRange()[0] > 1 && (<>
                <button onClick={() => setCurrentPage(1)} className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9">
                  <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" /><span className="relative">1</span>
                </button>
                {getPageRange()[0] > 2 && <span className="font-sans text-xs text-neutral-300 px-1">…</span>}
              </>)}
              {getPageRange().map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`group relative overflow-hidden border font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9 transition-colors duration-200 ${page === currentPage ? 'bg-violet-600 border-violet-600 text-white' : 'border-violet-100 text-violet-400'}`}>
                  {page !== currentPage && <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />}
                  <span className="relative">{page}</span>
                </button>
              ))}
              {getPageRange()[getPageRange().length - 1] < totalPages && (<>
                {getPageRange()[getPageRange().length - 1] < totalPages - 1 && <span className="font-sans text-xs text-neutral-300 px-1">…</span>}
                <button onClick={() => setCurrentPage(totalPages)} className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9">
                  <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" /><span className="relative">{totalPages}</span>
                </button>
              </>)}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="group relative overflow-hidden border border-violet-100 text-violet-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-violet-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                <span className="relative">Next →</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BranchAppointments