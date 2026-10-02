import { useEffect, useContext, useState, useMemo, useCallback } from 'react'
import { BranchesContext } from '../../context/BranchesContext'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_WEIGHT_KG = 70

const DELIVERY_STEPS = [
  { status: 'pending_approval',  label: 'Pending Approval' },
  { status: 'approved',          label: 'Approved' },
  { status: 'picked_up',         label: 'Picked Up' },
  { status: 'in_progress',       label: 'On Process' },
  { status: 'out_for_delivery',  label: 'Out for Delivery' },
  { status: 'delivered',         label: 'Delivered' },
]

const SELF_PICKUP_STEPS = [
  { status: 'approved',    label: 'Approved' },
  { status: 'in_progress', label: 'On Process' },
  { status: 'delivered',   label: 'Completed' },
]

const WALKIN_DELIVERY_STEPS = [
  { status: 'approved',          label: 'Approved' },
  { status: 'in_progress',       label: 'On Process' },
  { status: 'out_for_delivery',  label: 'Out for Delivery' },
  { status: 'delivered',         label: 'Delivered' },
]

const getSteps = (appt) => {
  const isWalkIn = appt.bookingSource === 'WALK_IN'
  if (appt.fulfillmentMethod === 'SELF_PICKUP') return SELF_PICKUP_STEPS
  if (isWalkIn) return WALKIN_DELIVERY_STEPS
  return DELIVERY_STEPS
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all',              label: 'All Statuses' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved',         label: 'Approved' },
  { value: 'picked_up',        label: 'Picked Up' },
  { value: 'in_progress',      label: 'On Process' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'archived',         label: 'Archived' },
]

const STATUS_CHIP = {
  pending_approval: 'text-amber-600 border-amber-300 bg-amber-50',
  approved:         'text-blue-600 border-blue-300 bg-blue-50',
  picked_up:        'text-indigo-600 border-indigo-300 bg-indigo-50',
  in_progress:      'text-blue-600 border-blue-300 bg-blue-50',
  out_for_delivery: 'text-purple-600 border-purple-300 bg-purple-50',
  delivered:        'text-green-600 border-green-300 bg-green-50',
  cancelled:        'text-red-500 border-red-300 bg-red-50',
  archived:         'text-neutral-500 border-neutral-300 bg-neutral-100',
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

const PAGE_SIZE             = 6
const AUTO_REFRESH_INTERVAL = 30
const CARD_HEIGHT           = 'h-[580px]'

// ─── WEIGHT SANITIZER ────────────────────────────────────────────────────────
const sanitizeWeight = (v) => {
  let s = String(v ?? '').replace(/[^0-9.]/g, '')
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  const parts = s.split('.')
  if (parts[1] && parts[1].length > 2) {
    s = parts[0] + '.' + parts[1].slice(0, 2)
  }
  if (s !== '' && !isNaN(Number(s)) && Number(s) > MAX_WEIGHT_KG) {
    s = String(MAX_WEIGHT_KG)
  }
  return s
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const resolvePaymentStatus = (appt) => {
  if (appt.paymentStatus) return appt.paymentStatus
  if (appt.payment) return appt.paymentMethod === 'online' ? 'paid_online' : 'paid_cash'
  return 'unpaid'
}

const getNextStatus = (current, steps) => {
  const idx = steps.findIndex(s => s.status === current)
  if (idx === -1 || idx === steps.length - 1) return null
  return steps[idx + 1]
}

const renderServices = (appt) => {
  if (Array.isArray(appt.services) && appt.services.length > 0) {
    const count = appt.services.length
    const firstName = appt.services[0]?.name ?? appt.services[0]
    if (count === 1) return firstName
    return `${firstName} (x${count} baskets)`
  }
  if (appt.service) return appt.service
  return '—'
}

const renderAmount = (appt) => {
  const hasActual  = appt.actualFinalAmount != null
  const estimated  = appt.finalAmount ?? appt.totalAmount ?? 0
  const actual     = appt.actualFinalAmount ?? estimated
  const vatPercent = Math.round((appt.vatRate ?? 0) * 100)
  return (
    <div className="space-y-1">
      {appt.promoCode && appt.discountAmount > 0 && (
        <p className="font-sans text-xs text-green-600 font-semibold">
          {appt.promoCode} — -{fmt(appt.discountAmount)}
        </p>
      )}
      {appt.luckyWheelSpinId && (
        <p className="font-sans text-xs text-purple-600 font-semibold">
          {appt.luckyWheelPrizeLabel || 'Lucky Wheel Prize'}
        </p>
      )}
      {hasActual ? (
        <>
          <p className="font-sans text-[10px] text-neutral-400 uppercase tracking-wider">Estimated</p>
          <p className="font-sans text-xs text-neutral-400 line-through">{fmt(estimated)}</p>
          <p className="font-sans text-[10px] text-blue-500 uppercase tracking-wider mt-1">Actual</p>
          <p className="font-sans text-sm font-bold text-blue-900">{fmt(actual)}</p>
          {appt.overweightChargeTotal > 0 && (
            <p className="font-sans text-xs text-amber-600">Overweight: +{fmt(appt.overweightChargeTotal)}</p>
          )}
        </>
      ) : (
        <>
          {vatPercent > 0 && (
            <p className="font-sans text-xs text-neutral-400">incl. VAT ({vatPercent}%): {fmt(estimated - estimated / (1 + (appt.vatRate ?? 0)))}</p>
          )}
          <p className="font-sans text-sm font-bold text-blue-900">
            {fmt(estimated)}
            <span className="font-sans text-[10px] font-normal text-neutral-400 ml-1">(est.)</span>
          </p>
        </>
      )}
    </div>
  )
}

const renderWeight = (appt) => {
  if (!Array.isArray(appt.services) || appt.services.length === 0) return null

  const totalKg = appt.services.reduce((sum, svc) => sum + Number(svc.actualKg ?? svc.kg ?? 0), 0)
  const basketCount = appt.services.length
  const hasAnyActual = appt.services.some(svc => svc.actualKg != null)

  const MAX_VISIBLE = 3
  const visibleServices = appt.services.slice(0, MAX_VISIBLE)
  const hiddenCount = basketCount - visibleServices.length

  return (
    <div className="space-y-2">
      <div className="font-sans text-xs">
        <span className="text-blue-700 font-bold">Total: {totalKg.toFixed(1)}kg</span>
        <span className="text-neutral-400 ml-2">({basketCount} basket{basketCount !== 1 ? 's' : ''})</span>
        {!hasAnyActual && <span className="text-neutral-400 ml-1">(est.)</span>}
      </div>
      <div className="space-y-1">
        {visibleServices.map((svc, idx) => (
          <div key={idx} className="flex items-center gap-2 font-sans text-[11px]">
            <span className="text-neutral-400">Basket {idx + 1}:</span>
            {svc.actualKg != null ? (
              <>
                <span className="text-neutral-400 line-through">{svc.kg}kg</span>
                <span className="text-blue-700 font-bold">{svc.actualKg}kg</span>
                {svc.overweightCharge > 0 && (
                  <span className="text-amber-600 text-[10px]">+OW</span>
                )}
              </>
            ) : (
              <span className="text-neutral-600">{svc.kg}kg</span>
            )}
          </div>
        ))}
        {hiddenCount > 0 && (
          <p className="font-sans text-[11px] text-neutral-400 italic">... +{hiddenCount} more</p>
        )}
      </div>
    </div>
  )
}

// ─── ADD-ONS (grouped per basket) ─────────────────────────────────────────────
const renderAddOns = (appt) => {
  if (!Array.isArray(appt.addOns) || appt.addOns.length === 0) return null
  const total = appt.addOns.reduce((sum, a) => sum + (a.price * a.quantity), 0)

  // Group by basketIndex (null → "General Add-ons")
  const groups = appt.addOns.reduce((acc, a) => {
    const key = a.basketIndex != null ? a.basketIndex : 'none'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  // Sort: numbered baskets first (0,1,2...), then 'none' last
  const sortedKeys = Object.keys(groups).sort((x, y) => {
    if (x === 'none') return 1
    if (y === 'none') return -1
    return Number(x) - Number(y)
  })

  return (
    <div className="space-y-3">
      {sortedKeys.map(key => {
        const items = groups[key]
        const subTotal = items.reduce((s, a) => s + a.price * a.quantity, 0)
        return (
          <div key={key}>
            <p className="font-sans text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-1">
              {key === 'none' ? 'General Add-ons' : `Basket ${Number(key) + 1}`}
            </p>
            <div className="space-y-1">
              {items.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between font-sans text-xs text-neutral-600">
                  <span>· {a.name} x{a.quantity}</span>
                  <span className="font-medium">{fmt(a.price * a.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-sans text-[11px] text-neutral-400 mt-1 pl-3">
              <span>Subtotal</span>
              <span>{fmt(subTotal)}</span>
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between font-sans text-xs text-blue-700 font-bold pt-2 border-t border-blue-100">
        <span>Add-ons Total</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  )
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans mb-2">{children}</p>
)
const Divider = () => <div className="h-px bg-blue-100 mb-6" />

const StatusChip = ({ status, steps = DELIVERY_STEPS }) => {
  const color = STATUS_CHIP[status] || 'text-neutral-500 border-neutral-200 bg-neutral-50'
  const label = steps.find(s => s.status === status)?.label || status || 'Archived'
  return (
    <span className={`inline-block border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold ${color}`}>
      {label}
    </span>
  )
}

// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────

const ReceiptModal = ({ appt, onClose, onConfirm, loading, onEmailReceipt }) => {
  const isSelfPickupTarget = appt.__targetStatus === 'delivered' && appt.fulfillmentMethod === 'SELF_PICKUP'
  const [printed, setPrinted] = useState(false)
  const [printError, setPrintError] = useState(false)

  const hasActual   = appt.actualFinalAmount != null
  const estimated   = appt.finalAmount ?? appt.totalAmount ?? 0
  const finalAmt    = appt.actualFinalAmount ?? estimated
  const payStatus   = resolvePaymentStatus(appt)
  const isPaid      = payStatus === 'paid_cash' || payStatus === 'paid_online'
  const vatPercent  = Math.round((appt.vatRate ?? 0) * 100)
  const vatAmt      = finalAmt - finalAmt / (1 + (appt.vatRate ?? 0))
  const vatableSales = finalAmt - vatAmt
  const now         = new Date()
  const receiptDate = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  const receiptTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

  const receiptStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 10px; color: #000; background: #fff;
      width: 58mm; padding: 0; margin: 0 auto; font-weight: bold;
    }
    @page { size: 58mm 80mm !important; margin: 0 !important; padding: 0 !important; }
    .receipt-copy {
      width: 58mm; max-width: 58mm; padding: 2mm 3mm;
      page-break-after: always !important;
      font-weight: bold;
    }
    .receipt-copy:last-child { page-break-after: auto !important; }
    .center { text-align: center; }
    .bold { font-weight: 900; }
    .large { font-size: 13px; font-weight: 900; }
    .xlarge { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
    .small { font-size: 8px; font-weight: bold; color: #333; }
    .divider { border-top: 1px dashed #999; margin: 3px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; font-weight: bold; }
    .label { color: #444; font-weight: bold; }
    .total { font-size: 14px; font-weight: 900; }
    .chip {
      display: inline-block; border: 1px solid; padding: 2px 6px;
      font-size: 8px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
    }
    .paid { border-color: #16a34a; color: #16a34a; }
    .pending { border-color: #d97706; color: #d97706; }
    .tag { font-size: 7px; letter-spacing: 2px; text-transform: uppercase; color: #555; font-weight: bold; }
    .mt4 { margin-top: 4px; }
    .mb4 { margin-bottom: 4px; }
    .strike { text-decoration: line-through; color: #999; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; width: 58mm !important; height: 80mm !important; }
      .no-print { display: none !important; }
    }
  `

  const renderReceiptContent = (copyLabel) => `
    <div class="center mb4">
      <div class="tag">Branch Portal — ${copyLabel}</div>
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
      <div class="bold">${appt.slotDate} · ${appt.slotTime}</div>
    </div>
    <div class="divider"></div>
    <div class="mb4 mt4">
      <div class="tag">Services</div>
      ${(appt.services || []).map((svc, i) => `
        <div class="row" style="margin-top:2px"><span class="bold">Basket ${i + 1} — ${svc.name}</span></div>
        <div class="row"><span class="label">Est. weight</span><span class="bold">${svc.kg}kg</span></div>
        ${svc.actualKg != null ? `<div class="row"><span class="label">Actual weight</span><span class="bold">${svc.actualKg}kg</span></div>` : ''}
        ${svc.overweightCharge > 0 ? `<div class="row"><span class="label">Overweight charge</span><span class="bold">${fmt(svc.overweightCharge)}</span></div>` : ''}
      `).join('')}
    </div>
    ${appt.addOns?.length > 0 ? `
    <div class="divider"></div>
    <div class="mb4 mt4">
      <div class="tag">Add-ons</div>
      ${appt.addOns.map(a => `<div class="row"><span class="bold">${a.basketIndex != null ? `B${a.basketIndex + 1} — ` : ''}${a.name} x${a.quantity}</span><span class="bold">${fmt(a.price * a.quantity)}</span></div>`).join('')}
    </div>` : ''}
    <div class="divider"></div>
    <div class="mb4 mt4">
      ${hasActual
        ? `<div class="row"><span class="label">Estimated</span><span class="strike">${fmt(estimated)}</span></div>
          ${appt.overweightChargeTotal > 0 ? `<div class="row"><span class="label">Overweight total</span><span class="bold">+${fmt(appt.overweightChargeTotal)}</span></div>` : ''}`
        : ''
      }
      ${appt.discountAmount > 0 ? `<div class="row"><span class="label">Discount (${appt.promoCode || ''})</span><span class="bold">-${fmt(appt.discountAmount)}</span></div>` : ''}
      <div class="divider"></div>
      <div class="row total"><span>TOTAL</span><span>${fmt(finalAmt)}</span></div>
      ${vatPercent > 0 ? `
      <div class="row small"><span>VATable Sales</span><span>${fmt(vatableSales)}</span></div>
      <div class="row small"><span>VAT (${vatPercent}%)</span><span>${fmt(vatAmt)}</span></div>
      <div class="center small">Price is VAT inclusive</div>` : ''}
    </div>
    <div class="divider"></div>
    <div class="center mt4">
      <span class="chip ${isPaid ? 'paid' : 'pending'}">${PAYMENT_STATUS_LABEL[payStatus] || 'Unpaid'}</span>
      <div class="small" style="margin-top:2px">Payment: ${appt.preferredPaymentMethod === 'online' ? 'Online' : 'Cash'}</div>
    </div>
    <div class="divider" style="margin-top:10px"></div>
    <div class="center small" style="margin-top:3px">Thank you for choosing Selfie Wash!<br/>Please keep this receipt.</div>
  `

  const handlePrint = () => {
    setPrintError(false)
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600')
      if (!printWindow) { setPrintError(true); return }

      const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>${receiptStyles}</style>
        <script>
          window.onload = function() {
            setTimeout(function() {
              try {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
              } catch (e) { console.log('Print cancelled'); }
            }, 500);
          };
        <\/script>
      </head>
      <body>
        <div class="receipt-copy">${renderReceiptContent('Branch Copy')}</div>
        ${appt.bookingSource === 'WALK_IN' ? `<div class="receipt-copy">${renderReceiptContent('Client Copy')}</div>` : ''}
      </body>
      </html>`

      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setPrinted(true)
      if (appt.bookingSource === 'ONLINE' && onEmailReceipt) onEmailReceipt(appt.id)
    } catch (error) {
      console.error('Print error:', error)
      setPrintError(true)
    }
  }

  const renderPreview = () => (
    <div className="border border-dashed border-neutral-300 bg-neutral-50 p-2.5 font-mono text-[8px] text-neutral-800" style={{ maxWidth: '58mm', margin: '0 auto' }}>
      <div className="text-center mb-1.5">
        <p className="text-[6px] uppercase tracking-[0.3em] text-neutral-400">Branch Portal — Preview</p>
        <p className="font-black text-sm tracking-tight">SELFIE WASH</p>
        <p className="text-[6px] text-neutral-400">Official Service Receipt</p>
        <div className="border-t border-dashed border-neutral-300 mt-1 pt-1">
          <p className="text-[6px] text-neutral-400">{receiptDate} · {receiptTime}</p>
        </div>
      </div>
      <div className="mb-1.5">
        <p className="text-[6px] uppercase tracking-widest text-neutral-400 mb-0.5">Client</p>
        <p className="font-bold text-[8px]">{appt.userData?.name || '—'}</p>
        <p className="text-[6px] text-neutral-400">{appt.userData?.email || ''}</p>
      </div>
      <div className="border-t border-dashed border-neutral-300 my-1.5" />
      <div className="mb-1.5">
        <p className="text-[6px] uppercase tracking-widest text-neutral-400 mb-0.5">Schedule</p>
        <p>{appt.slotDate} · {appt.slotTime}</p>
      </div>
      <div className="border-t border-dashed border-neutral-300 my-1.5" />
      <div className="mb-1.5">
        <p className="text-[6px] uppercase tracking-widest text-neutral-400 mb-0.5">Services</p>
        {(appt.services || []).map((svc, i) => (
          <div key={i} className="mb-1">
            <p className="font-bold text-[7px]">Basket {i + 1} — {svc.name}</p>
            <div className="flex justify-between text-[7px]"><span className="text-neutral-500">Est. weight</span><span>{svc.kg}kg</span></div>
            {svc.actualKg != null && <div className="flex justify-between text-[7px]"><span className="text-neutral-500">Actual weight</span><span className="font-bold text-blue-700">{svc.actualKg}kg</span></div>}
            {svc.overweightCharge > 0 && <div className="flex justify-between text-[7px]"><span className="text-neutral-500">Overweight charge</span><span className="text-amber-600">{fmt(svc.overweightCharge)}</span></div>}
          </div>
        ))}
      </div>
      {appt.addOns?.length > 0 && (
        <>
          <div className="border-t border-dashed border-neutral-300 my-1.5" />
          <div className="mb-1.5">
            <p className="text-[6px] uppercase tracking-widest text-neutral-400 mb-0.5">Add-ons</p>
            {appt.addOns.map((a, i) => (
              <div key={i} className="flex justify-between text-[7px]"><span>{a.basketIndex != null ? `B${a.basketIndex + 1} — ` : ''}{a.name} x{a.quantity}</span><span>{fmt(a.price * a.quantity)}</span></div>
            ))}
          </div>
        </>
      )}
      <div className="border-t border-dashed border-neutral-300 my-1.5" />
      <div className="mb-1.5 space-y-0.5">
        {hasActual ? (
          <>
            <div className="flex justify-between text-[7px]"><span className="text-neutral-500">Estimated</span><span className="line-through text-neutral-400">{fmt(estimated)}</span></div>
            {appt.overweightChargeTotal > 0 && <div className="flex justify-between text-[7px]"><span className="text-neutral-500">Overweight total</span><span className="text-amber-600">+{fmt(appt.overweightChargeTotal)}</span></div>}
          </>
        ) : null}
        {appt.discountAmount > 0 && <div className="flex justify-between text-[7px]"><span className="text-neutral-500">Discount {appt.promoCode && `(${appt.promoCode})`}</span><span className="text-green-600">-{fmt(appt.discountAmount)}</span></div>}
        <div className="border-t border-dashed border-neutral-300 pt-1 mt-1 flex justify-between font-black text-[9px]">
          <span>TOTAL</span><span className="text-blue-900">{fmt(finalAmt)}</span>
        </div>
        {vatPercent > 0 && (
          <>
            <div className="flex justify-between text-[7px]"><span className="text-neutral-500">VATable Sales</span><span>{fmt(vatableSales)}</span></div>
            <div className="flex justify-between text-[7px]"><span className="text-neutral-500">VAT ({vatPercent}%)</span><span>{fmt(vatAmt)}</span></div>
            <p className="text-center text-[6px] text-neutral-400">Price is VAT inclusive</p>
          </>
        )}
      </div>
      <div className="border-t border-dashed border-neutral-300 my-1.5" />
      <div className="text-center">
        <span className={`inline-block border px-1.5 py-0.5 text-[6px] uppercase tracking-widest font-bold ${PAYMENT_STATUS_CHIP[payStatus] || PAYMENT_STATUS_CHIP.unpaid}`}>
          {PAYMENT_STATUS_LABEL[payStatus] || 'Unpaid'}
        </span>
        <p className="text-[6px] text-neutral-400 mt-0.5">Payment: {appt.preferredPaymentMethod === 'online' ? 'Online' : 'Cash'}</p>
      </div>
      <div className="border-t border-dashed border-neutral-300 mt-2 pt-1.5 text-center">
        <p className="text-[6px] text-neutral-400">Thank you for choosing Selfie Wash!</p>
        <p className="text-[6px] text-neutral-400">Please keep this receipt.</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-lg flex flex-col max-h-[90vh]" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="px-6 py-5 flex-shrink-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>Print Receipt</h2>
              <p className="font-sans text-xs text-blue-300 mt-0.5">58mm thermal printer</p>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {printError ? (
            <div className="bg-red-50 border border-red-200 px-4 py-3 mb-4">
              <p className="font-sans text-sm text-red-700 font-bold">Print Error</p>
              <p className="font-sans text-xs text-red-600 mt-1">Unable to print. Please check if:</p>
              <ul className="font-sans text-xs text-red-600 mt-1 list-disc pl-4 space-y-0.5">
                <li>A printer is connected and turned on</li>
                <li>Pop-ups are allowed for this site</li>
                <li>The printer has paper</li>
              </ul>
              <button onClick={() => setPrintError(false)} className="mt-2 text-xs text-red-700 underline font-bold hover:text-red-900">Try again</button>
            </div>
          ) : renderPreview()}
          {printed && !printError && (
            <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2.5 max-w-xs mx-auto">
              <span className="text-green-600 text-sm">✓</span>
              <p className="font-sans text-xs text-green-700 font-semibold">Receipt printed — ready to proceed</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-4 pt-3 flex gap-3 flex-shrink-0 border-t border-blue-100">
          <button onClick={handlePrint} className="group relative overflow-hidden border border-blue-400 text-blue-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center gap-2 flex-1 py-2.5" style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            <span className="relative">{printed ? 'Print Again' : 'Print Receipt'}</span>
          </button>
          <button onClick={onConfirm} disabled={!printed || loading || printError} className={`group relative overflow-hidden font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center flex-1 py-2.5 disabled:cursor-not-allowed transition-colors ${printed && !printError ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-neutral-400'}`} style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            {printed && !printError && <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />}
            <span className="relative">{loading ? 'Processing...' : (isSelfPickupTarget ? 'Mark Completed' : 'Out for Delivery')}</span>
          </button>
        </div>
        {(!printed || printError) && (
          <p className="text-center font-sans text-[10px] text-neutral-400 pb-4">
            {printError ? 'Fix the issues above then try again' : `Print the receipt first to enable the ${isSelfPickupTarget ? 'Mark Completed' : 'Out for Delivery'} button`}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── ACTUAL WEIGHT MODAL ──────────────────────────────────────────────────────

const ActualWeightModal = ({ appt, onClose, onSubmit, loading }) => {
  const isEditing = appt.services.some(s => s.actualKg != null)
  const [actualKgs, setActualKgs] = useState(
    appt.services.map((s, i) => ({ serviceIndex: i, actualKg: s.actualKg ?? s.kg ?? '' }))
  )
  const [errors, setErrors] = useState({})

  const handleChange = (idx, value) => {
    const cleaned = sanitizeWeight(value)
    setActualKgs(prev => prev.map((item, i) => i === idx ? { ...item, actualKg: cleaned } : item))
    if (errors[idx]) setErrors(prev => { const e = { ...prev }; delete e[idx]; return e })
  }

  const handleKeyDown = (idx) => (e) => {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter']
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key.length === 1 && !/[0-9.]/.test(e.key)) { e.preventDefault(); return }
    const current = String(actualKgs[idx]?.actualKg ?? '')
    if (e.key === '.' && current.includes('.')) { e.preventDefault(); return }
    if (e.key.length === 1) {
      const next = current + e.key
      if (!isNaN(Number(next)) && Number(next) > MAX_WEIGHT_KG) e.preventDefault()
    }
  }

  const handlePaste = (idx) => (e) => {
    e.preventDefault()
    const pasted = (e.clipboardData || window.clipboardData).getData('text') || ''
    const cleaned = sanitizeWeight(pasted)
    setActualKgs(prev => prev.map((item, i) => i === idx ? { ...item, actualKg: cleaned } : item))
    if (errors[idx]) setErrors(prev => { const e = { ...prev }; delete e[idx]; return e })
  }

  const handleSubmit = () => {
    const errs = {}
    for (const item of actualKgs) {
      const val = Number(item.actualKg)
      if (!item.actualKg || item.actualKg === '') {
        errs[item.serviceIndex] = `Weight is required for basket ${item.serviceIndex + 1}`
      } else if (isNaN(val) || val < 1) {
        errs[item.serviceIndex] = `Minimum weight is 1kg (basket ${item.serviceIndex + 1})`
      } else if (val > MAX_WEIGHT_KG) {
        errs[item.serviceIndex] = `Maximum weight is ${MAX_WEIGHT_KG}kg (basket ${item.serviceIndex + 1})`
      }
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit(actualKgs.map(item => ({ serviceIndex: item.serviceIndex, actualKg: Number(item.actualKg) })))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="px-6 py-5 sticky top-0 z-10" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>
                {isEditing ? 'Update Actual Weight' : 'Confirm Actual Weight'}
              </h2>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="font-sans text-xs text-neutral-400">
            {isEditing
              ? 'Update the actual weight to correct a previous entry. Final amount will be recomputed.'
              : 'Enter the actual weight after physically weighing each basket. Final amount will be recomputed.'}
          </p>
          {appt.services.map((svc, idx) => {
            const weightValue = actualKgs[idx]?.actualKg ? Number(actualKgs[idx].actualKg) : 0
            const isOverweight = weightValue > 7
            const isOverMax = weightValue > MAX_WEIGHT_KG
            const hasErr = !!errors[idx]
            return (
              <div key={idx} className={`border px-4 py-4 ${hasErr || isOverMax ? 'border-red-300 bg-red-50/30' : 'border-blue-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-sans text-xs font-bold text-blue-600 uppercase tracking-wider">Basket {idx + 1} — {svc.name}</p>
                    <p className="font-sans text-xs text-neutral-400 mt-0.5">Estimated: {svc.kg}kg ({fmt(svc.kgPrice)})</p>
                  </div>
                  {svc.actualKg != null && (
                    <span className="font-sans text-xs bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5">
                      Current: {svc.actualKg}kg
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="font-sans text-xs text-neutral-500 uppercase tracking-wider flex-shrink-0">
                    {svc.actualKg != null ? 'New KG' : 'Actual KG'}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max={MAX_WEIGHT_KG}
                    step="0.1"
                    value={actualKgs[idx]?.actualKg ?? ''}
                    onWheel={e => e.currentTarget.blur()}
                    onKeyDown={handleKeyDown(idx)}
                    onChange={e => handleChange(idx, e.target.value)}
                    onPaste={handlePaste(idx)}
                    onDrop={e => e.preventDefault()}
                    className={`flex-1 px-4 py-2.5 border font-sans text-sm text-neutral-700 focus:outline-none transition-colors bg-white ${
                      hasErr || isOverMax ? 'border-red-300 focus:border-red-400' : 'border-blue-100 focus:border-blue-400'
                    }`}
                    placeholder={`e.g. ${svc.actualKg ?? svc.kg}`}
                  />
                  <span className="font-sans text-xs text-neutral-400 flex-shrink-0">kg</span>
                </div>
                {hasErr && (
                  <p className="font-sans text-xs text-red-500 mt-1.5">{errors[idx]}</p>
                )}
                {!hasErr && isOverMax && (
                  <p className="font-sans text-xs text-red-500 mt-1.5">Maximum weight is {MAX_WEIGHT_KG}kg</p>
                )}
                {!hasErr && !isOverMax && isOverweight && (
                  <p className="font-sans text-xs text-amber-600 mt-1.5">
                    Over 7kg — overweight charge of ₱20/kg applies for {(weightValue - 7).toFixed(1)}kg extra
                  </p>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white border-t border-blue-100 pt-4">
          <button onClick={onClose}
            className="flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-blue-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : isEditing ? 'Update Weight' : 'Confirm Weight'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CASH PAYMENT MODAL ───────────────────────────────────────────────────────

const CashPaymentModal = ({ appt, onClose, onSubmit, loading }) => {
  const finalAmt = appt.actualFinalAmount ?? appt.finalAmount ?? appt.totalAmount ?? 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-md" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="px-6 py-5" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>Confirm Cash Payment</h2>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="bg-blue-50 border border-blue-100 px-5 py-4 flex items-center justify-between">
            <span className="font-sans text-xs uppercase tracking-widest text-neutral-500">Amount Collected</span>
            <span className="font-sans font-black text-blue-700 text-xl" style={{ letterSpacing: '-0.02em' }}>{fmt(finalAmt)}</span>
          </div>
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 px-4 py-3">
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
          <button onClick={onClose}
            className="flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-blue-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => onSubmit('cash')} disabled={loading}
            className="flex-1 bg-green-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-green-700 transition-colors disabled:opacity-50">
            {loading ? 'Processing...' : 'Confirm Cash Received'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ARCHIVE MODAL ────────────────────────────────────────────────────────────

const ArchiveModal = ({ appt, onClose, onConfirm, loading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-md" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
        <div className="px-6 py-5" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-0.5">Branch Portal</p>
              <h2 className="font-sans font-black text-white text-lg" style={{ letterSpacing: '-0.02em' }}>Archive Appointment</h2>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="font-sans text-sm text-amber-700">Are you sure you want to archive this appointment?</p>
            <p className="font-sans text-xs text-amber-600 mt-1">This will move it to the archived section. You can still view it later.</p>
          </div>
          <div className="border border-blue-100 px-4 py-3">
            <p className="font-sans text-xs text-neutral-500">Client</p>
            <p className="font-sans text-sm font-semibold text-neutral-700">{appt.userData?.name || '—'}</p>
            <p className="font-sans text-xs text-neutral-400 mt-1">{appt.slotDate} · {appt.slotTime}</p>
            <p className="font-sans text-xs text-neutral-400">{renderServices(appt)}</p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-blue-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-amber-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-2.5 hover:bg-amber-700 transition-colors disabled:opacity-50">
            {loading ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────

const AppointmentCard = ({
  appt,
  cardNumber,
  onWeigh,
  onCash,
  onArchive,
  onNextStatus,
  onReceipt,
  onApprove,
  onCancel,
}) => {
  const isCancelled    = appt.cancelled
  const isCompleted    = appt.isCompleted
  const isArchived     = appt.archived

  const steps          = getSteps(appt)
  const nextStatus     = getNextStatus(appt.deliveryStatus || 'pending_approval', steps)

  const showButtons    = !isCancelled && !isCompleted && !isArchived
  const payStatus      = resolvePaymentStatus(appt)
  const isWeighed      = appt.services?.some(s => s.actualKg != null)
  const isPaid         = payStatus === 'paid_cash' || payStatus === 'paid_online'

  const isCashMethod   = appt.preferredPaymentMethod === 'cash' || !appt.preferredPaymentMethod
  const isOnlineMethod = appt.preferredPaymentMethod === 'online'
  const hasOverweightDecision = appt.overweightStatus === 'pending_decision'
  const isSelfPickup   = appt.fulfillmentMethod === 'SELF_PICKUP'

  const canWeigh       = !isCancelled && !isCompleted && !isArchived && appt.deliveryStatus === 'in_progress' && !isPaid && appt.bookingSource !== 'WALK_IN'
  const canConfirmCash = !isCancelled && !isPaid && isCashMethod && !isArchived && (
    isSelfPickup
      ? ['approved', 'in_progress'].includes(appt.deliveryStatus)
      : appt.deliveryStatus === 'out_for_delivery'
  )

  const blockedByOnlinePayment = isOnlineMethod && !isPaid
    && (nextStatus?.status === 'out_for_delivery' || (isSelfPickup && nextStatus?.status === 'delivered'))

  const blockedByCashPayment = isCashMethod && !isPaid
    && nextStatus?.status === 'delivered'

  const canArchive = !isArchived && (appt.deliveryStatus === 'delivered' || isCancelled)

  const handleNextStatus = () => {
    if (!nextStatus) return
    if (blockedByOnlinePayment || blockedByCashPayment || hasOverweightDecision) return
    const needsReceipt = isSelfPickup ? nextStatus.status === 'delivered' : nextStatus.status === 'out_for_delivery'
    if (needsReceipt) onReceipt({ ...appt, __targetStatus: nextStatus.status })
    else onNextStatus(appt.id, nextStatus.status)
  }

  const hasActions = showButtons && (
    appt.deliveryStatus === 'pending_approval' ||
    (nextStatus && !blockedByOnlinePayment && !blockedByCashPayment && !hasOverweightDecision) ||
    canWeigh || canConfirmCash
  )

  return (
    <div className={`bg-white border border-blue-100 flex flex-col ${CARD_HEIGHT} overflow-hidden`}>

      {/* ── Pinned header ── */}
      <div className="px-6 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">

            {/* Card number badge */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 border border-blue-200 bg-blue-50">
              <span className="font-sans text-[8px] uppercase tracking-widest text-blue-400 font-semibold leading-none mb-0.5">No.</span>
              <span className="font-sans font-black text-blue-600 text-xs leading-none" style={{ letterSpacing: '-0.02em' }}>
                {cardNumber}
              </span>
            </div>

            {appt.userData?.image
              ? <img src={appt.userData.image} className="w-10 h-10 object-cover flex-shrink-0 border border-blue-100" alt="" />
              : (
                <div className="w-10 h-10 bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold font-sans text-sm">
                  {appt.userData?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )
            }
            <div className="min-w-0">
              <p className="text-blue-900 font-bold text-sm truncate" style={{ letterSpacing: '-0.01em' }}>
                {appt.userData?.name || '—'}
              </p>
              <p className="font-sans text-xs text-neutral-400 truncate">{appt.userData?.email || ''}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`inline-block border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold ${PAYMENT_STATUS_CHIP[payStatus] || PAYMENT_STATUS_CHIP.unpaid}`}>
              {PAYMENT_STATUS_LABEL[payStatus] || 'Unpaid'}
            </span>
            <span className="font-sans text-[10px] text-neutral-400">
              {isOnlineMethod ? 'Online' : 'Cash'}
            </span>
            {isArchived && (
              <span className="inline-block border border-neutral-300 bg-neutral-100 text-neutral-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold mt-0.5">
                Archived
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-blue-100 flex-shrink-0" />

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Info grid */}
        <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-5">
          <div className="min-w-0">
            <SectionLabel>Service</SectionLabel>
            <p className="font-sans text-sm text-neutral-700 truncate">{renderServices(appt)}</p>
          </div>
          <div className="min-w-0">
            <SectionLabel>Schedule</SectionLabel>
            <p className="font-sans text-sm text-neutral-700">{appt.slotDate}</p>
            <p className="font-sans text-xs text-neutral-400">{appt.slotTime}</p>
          </div>
          <div className="min-w-0">
            <SectionLabel>Amount</SectionLabel>
            {renderAmount(appt)}
          </div>
          <div className="min-w-0">
            <SectionLabel>Weight</SectionLabel>
            {renderWeight(appt) || <p className="font-sans text-sm text-neutral-400">—</p>}
          </div>
        </div>

        {/* Add-ons */}
        {Array.isArray(appt.addOns) && appt.addOns.length > 0 && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-5">
              <SectionLabel>Add-ons</SectionLabel>
              {renderAddOns(appt)}
            </div>
          </>
        )}

        {/* Other details */}
        {(appt.overweightResolution || appt.preferredPaymentMethod || appt.bookingSource) && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-5">
              <SectionLabel>Other Details</SectionLabel>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-sans text-xs text-neutral-600">
                {appt.overweightResolution && (
                  <span>Overweight: <span className="font-medium capitalize">{appt.overweightResolution}</span></span>
                )}
                {appt.preferredPaymentMethod && (
                  <span>Payment: <span className="font-medium capitalize">{appt.preferredPaymentMethod}</span></span>
                )}
                {appt.bookingSource && (
                  <span>Source: <span className="font-medium">{appt.bookingSource}</span></span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {appt.specialInstructions && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-5">
              <SectionLabel>Notes</SectionLabel>
              <p className="font-sans text-sm text-neutral-500 italic">"{appt.specialInstructions}"</p>
            </div>
          </>
        )}

        {/* Pickup Address */}
        {appt.pickupAddress?.line1 && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-5">
              <SectionLabel>Pickup Address</SectionLabel>
              <p className="font-sans text-sm text-neutral-700 leading-relaxed">
                {appt.pickupAddress.line1}{appt.pickupAddress.line2 ? ', ' + appt.pickupAddress.line2 : ''}
              </p>
            </div>
          </>
        )}

        {/* Delivery Address */}
        {appt.deliveryAddress?.line1 && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-5">
              <SectionLabel>Delivery Address</SectionLabel>
              <p className="font-sans text-sm text-neutral-700 leading-relaxed">
                {appt.deliveryAddress.line1}{appt.deliveryAddress.line2 ? ', ' + appt.deliveryAddress.line2 : ''}
              </p>
            </div>
          </>
        )}

        {/* Preferred pickup window */}
        {appt.preferredPickupWindow && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-5">
              <SectionLabel>Preferred Pickup Window</SectionLabel>
              <p className="font-sans text-sm text-neutral-700">{appt.preferredPickupWindow}</p>
            </div>
          </>
        )}

        {/* Notices */}
        {isOnlineMethod && !isPaid && appt.deliveryStatus === 'out_for_delivery' && !isArchived && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-4 bg-blue-50">
              <p className="font-sans text-xs text-blue-600">Client will pay online. Waiting for online payment confirmation.</p>
            </div>
          </>
        )}

        {isCashMethod && !isPaid && appt.deliveryStatus === 'out_for_delivery' && !isArchived && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-4 bg-amber-50">
              <p className="font-sans text-xs text-amber-600">Waiting for cash payment confirmation before marking as Delivered.</p>
            </div>
          </>
        )}

        {hasOverweightDecision && (
          <>
            <div className="h-px bg-blue-100" />
            <div className="px-6 py-4 bg-amber-50">
              <p className="font-sans text-xs text-amber-600">
                Overweight by {appt.overweightExcessKg}kg — waiting for client decision (split or trim). Auto-cancels if unresolved by end of day.
              </p>
            </div>
          </>
        )}

      </div>

      {/* ── Pinned footer: status + actions ── */}
      <div className="h-px bg-blue-100 flex-shrink-0" />
      <div className="px-6 py-4 flex-shrink-0 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {isCancelled
            ? (
              <span className="inline-block border border-red-300 bg-red-50 text-red-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold">
                Cancelled
              </span>
            )
            : <StatusChip status={appt.deliveryStatus || 'pending_approval'} steps={steps} />
          }
          {isWeighed && !isPaid && appt.deliveryStatus === 'in_progress' && !isArchived && (
            <span className="inline-block border border-amber-300 bg-amber-50 text-amber-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold">
              Weight Confirmed
            </span>
          )}
          {hasOverweightDecision && (
            <span className="inline-block border border-amber-300 bg-amber-50 text-amber-600 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold">
              Awaiting Client Decision
            </span>
          )}
          {isArchived && (
            <span className="inline-block border border-neutral-300 bg-neutral-100 text-neutral-500 px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-semibold">
              Archived
            </span>
          )}
        </div>

        {hasActions && (
          <div className="flex flex-wrap gap-2 mt-3">
            {appt.deliveryStatus === 'pending_approval' && (
              <>
                <button onClick={() => onApprove(appt.id)}
                  className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                  <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">Approve</span>
                </button>
                <button onClick={() => onCancel(appt.id)}
                  className="group relative overflow-hidden border border-blue-200 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                  <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">Cancel</span>
                </button>
              </>
            )}

            {appt.deliveryStatus !== 'pending_approval' && nextStatus && !blockedByOnlinePayment && !blockedByCashPayment && !hasOverweightDecision && (
              <button onClick={handleNextStatus}
                className="group relative overflow-hidden bg-blue-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                <span className="relative">
                  {(nextStatus.status === 'out_for_delivery' || (isSelfPickup && nextStatus.status === 'delivered')) ? 'Print & ' : ''}{nextStatus.label}
                </span>
              </button>
            )}

            {canWeigh && (
              <button onClick={() => onWeigh(appt)}
                className="group relative overflow-hidden border border-blue-400 text-blue-600 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                <span className="relative">{isWeighed ? 'Update Weight' : 'Confirm Weight'}</span>
              </button>
            )}

            {canConfirmCash && (
              <button onClick={() => onCash(appt)}
                className="group relative overflow-hidden bg-green-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5"
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-green-700 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                <span className="relative">Confirm Payment</span>
              </button>
            )}

            {canArchive && (
              <button onClick={() => onArchive(appt)}
                className="group relative overflow-hidden border border-neutral-300 text-neutral-500 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-neutral-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                <span className="relative">Archive</span>
              </button>
            )}
          </div>
        )}

        {!hasActions && canArchive && (
          <div className="flex justify-end mt-3">
            <button onClick={() => onArchive(appt)}
              className="group relative overflow-hidden border border-neutral-300 text-neutral-500 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-5 py-2.5 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className="absolute inset-0 bg-neutral-50 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              <span className="relative">Archive</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AllAppointments = () => {
  const {
    bToken,
    appointments,      getBranchAppointments,
    cancelAppointment,
    updateDeliveryStatus,
    emailReceipt,
    confirmActualWeight,
    confirmPayment,
    archiveAppointment,
  } = useContext(BranchesContext)

  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [paymentFilter,  setPaymentFilter]  = useState('all')
  const [sourceFilter,   setSourceFilter]   = useState('all')
  const [currentPage,    setCurrentPage]    = useState(1)
  const [weightModal,    setWeightModal]    = useState(null)
  const [paymentModal,   setPaymentModal]   = useState(null)
  const [receiptModal,   setReceiptModal]   = useState(null)
  const [archiveModal,   setArchiveModal]   = useState(null)
  const [modalLoading,   setModalLoading]   = useState(false)
  const [lastUpdated,    setLastUpdated]    = useState(null)
  const [secondsAgo,     setSecondsAgo]     = useState(0)
  const [isRefreshing,   setIsRefreshing]   = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    await getBranchAppointments()
    setLastUpdated(new Date())
    setSecondsAgo(0)
    setIsRefreshing(false)
  }, [getBranchAppointments])

  useEffect(() => { if (bToken) { refresh() } }, [bToken])
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
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, paymentFilter, sourceFilter])

  const handleConfirmWeight = async (actualServices) => {
    setModalLoading(true)
    const ok = await confirmActualWeight(weightModal.id, actualServices)
    setModalLoading(false)
    if (ok) setWeightModal(null)
  }

  const handleConfirmPayment = async (method) => {
    setModalLoading(true)
    const ok = await confirmPayment(paymentModal.id, method)
    setModalLoading(false)
    if (ok) setPaymentModal(null)
  }

  const handleReceiptConfirm = async () => {
    setModalLoading(true)
    await updateDeliveryStatus(receiptModal.id, receiptModal.__targetStatus || 'out_for_delivery')
    setModalLoading(false)
    setReceiptModal(null)
  }

  const handleArchiveConfirm = async () => {
    setModalLoading(true)
    const ok = await archiveAppointment(archiveModal.id)
    setModalLoading(false)
    if (ok) setArchiveModal(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return appointments.filter(appt => {
      if (statusFilter === 'archived') {
        return appt.archived === true
      }

      if (appt.archived) return false

      if (sourceFilter !== 'all' && appt.bookingSource !== sourceFilter) return false

      const isCancelled = appt.cancelled
      if (statusFilter === 'cancelled' && !isCancelled) return false
      if (statusFilter !== 'all' && statusFilter !== 'cancelled') {
        if (isCancelled) return false
        if (appt.deliveryStatus !== statusFilter) return false
      }
      if (paymentFilter !== 'all') {
        const ps = resolvePaymentStatus(appt)
        if (ps !== paymentFilter) return false
      }
      if (q) {
        const serviceNames = Array.isArray(appt.services)
          ? appt.services.map(s => s.name ?? '').join(' ')
          : (appt.service ?? '')
        const fields = [
          appt.userData?.name, appt.userData?.email,
          appt.id, serviceNames, appt.promoCode, appt.slotDate,
        ].map(f => (f ?? '').toLowerCase())
        if (!fields.some(f => f.includes(q))) return false
      }
      return true
    }).sort((a, b) => {
      if (a.archived && !b.archived) return 1
      if (!a.archived && b.archived) return -1
      return Number(b.date) - Number(a.date)
    })
  }, [appointments, search, statusFilter, paymentFilter, sourceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )

  const getPageRange = () => {
    const delta = 2
    const left  = Math.max(1, currentPage - delta)
    const right = Math.min(totalPages, currentPage + delta)
    const range = []; for (let i = left; i <= right; i++) range.push(i); return range
  }

  const hasFilters   = search || statusFilter !== 'all' || paymentFilter !== 'all' || sourceFilter !== 'all'
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setPaymentFilter('all'); setSourceFilter('all') }
  const selectClass  = 'px-4 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-blue-400 transition-colors bg-white appearance-none cursor-pointer'

  const lastUpdatedLabel = lastUpdated
    ? secondsAgo < 5 ? 'Just now' : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`
    : '—'

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-neutral-50">

      {weightModal  && <ActualWeightModal appt={weightModal}  onClose={() => setWeightModal(null)}  onSubmit={handleConfirmWeight}  loading={modalLoading} />}
      {paymentModal && <CashPaymentModal  appt={paymentModal} onClose={() => setPaymentModal(null)} onSubmit={handleConfirmPayment} loading={modalLoading} />}
      {receiptModal && <ReceiptModal      appt={receiptModal} onClose={() => setReceiptModal(null)} onConfirm={handleReceiptConfirm} loading={modalLoading} onEmailReceipt={emailReceipt} />}
      {archiveModal && <ArchiveModal      appt={archiveModal} onClose={() => setArchiveModal(null)} onConfirm={handleArchiveConfirm} loading={modalLoading} />}

      {/* ── Header ── */}
      <div className="px-10 pt-10 pb-12"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #2563eb' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-blue-200 font-sans mb-3">Operations</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white"
              style={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>
              All Appointments
            </h1>
            <p className="font-sans text-sm text-blue-300 mt-2">Manage and update all branch appointments</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="font-sans text-[10px] uppercase tracking-widest text-blue-300">Last updated</p>
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

        <div className="flex gap-2 mb-6">
          {[
            { value: 'all',     label: 'All Sources' },
            { value: 'ONLINE',  label: 'Online' },
            { value: 'WALK_IN', label: 'Walk-In' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSourceFilter(opt.value)}
              className={`px-5 py-2 font-sans text-xs uppercase tracking-widest font-bold border transition-colors ${
                sourceFilter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-blue-500 border-blue-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <SectionLabel>Filter Appointments</SectionLabel>
        <Divider />

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email, service, promo, date..."
              className="w-full pl-10 pr-8 py-2.5 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300 hover:text-neutral-500 text-lg leading-none">×</button>
            )}
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
            {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className={selectClass}>
            <option value="all">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending_payment">Awaiting Payment</option>
            <option value="paid_cash">Paid (Cash)</option>
            <option value="paid_online">Paid (Online)</option>
          </select>
        </div>

        <div className="flex items-center justify-between mb-8">
          <p className="font-sans text-xs text-neutral-400">
            Showing{' '}
            <span className="text-blue-600 font-semibold">
              {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
            </span>{' '}
            of <span className="text-blue-600 font-semibold">{filtered.length}</span> appointment{filtered.length !== 1 ? 's' : ''}
          </p>
          {hasFilters && (
            <button onClick={clearFilters}
              className="font-sans text-xs uppercase tracking-[0.2em] text-blue-400 hover:text-blue-600 transition-colors">
              Clear Filters ×
            </button>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="border border-blue-100 px-7 py-16 flex flex-col items-center gap-3 bg-white">
            <p className="font-sans text-sm text-neutral-300 uppercase tracking-widest">
              {appointments.length === 0 ? 'No appointments found' : 'No appointments match your filters'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters}
                className="font-sans text-xs uppercase tracking-[0.2em] text-blue-400 hover:text-blue-600 transition-colors">
                Clear Filters →
              </button>
            )}
          </div>
        )}

        {/* ── Cards grid: separate cards with gap ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {paginated.map((appt, idx) => {
            const globalIndex = (currentPage - 1) * PAGE_SIZE + idx
            const cardNumber = filtered.length - globalIndex

            return (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                cardNumber={cardNumber}
                onWeigh={setWeightModal}
                onCash={setPaymentModal}
                onArchive={setArchiveModal}
                onReceipt={setReceiptModal}
                onApprove={(id) => updateDeliveryStatus(id, 'approved')}
                onCancel={cancelAppointment}
                onNextStatus={updateDeliveryStatus}
              />
            )
          })}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
            <p className="font-sans text-xs text-neutral-400 uppercase tracking-[0.2em]">
              Page <span className="text-blue-600 font-semibold">{currentPage}</span> of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="group relative overflow-hidden border border-blue-100 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                <span className="relative">← Prev</span>
              </button>

              {getPageRange()[0] > 1 && (
                <>
                  <button onClick={() => setCurrentPage(1)}
                    className="group relative overflow-hidden border border-blue-100 text-blue-400 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9 bg-white">
                    <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                    <span className="relative">1</span>
                  </button>
                  {getPageRange()[0] > 2 && <span className="font-sans text-xs text-neutral-300 px-1">…</span>}
                </>
              )}

              {getPageRange().map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`group relative overflow-hidden border font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9 transition-colors duration-200 ${
                    page === currentPage ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-100 text-blue-400 bg-white'
                  }`}>
                  {page !== currentPage && <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />}
                  <span className="relative">{page}</span>
                </button>
              ))}

              {getPageRange().at(-1) < totalPages && (
                <>
                  {getPageRange().at(-1) < totalPages - 1 && <span className="font-sans text-xs text-neutral-300 px-1">…</span>}
                  <button onClick={() => setCurrentPage(totalPages)}
                    className="group relative overflow-hidden border border-blue-100 text-blue-400 font-sans text-xs font-bold inline-flex items-center justify-center w-9 h-9 bg-white">
                    <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                    <span className="relative">{totalPages}</span>
                  </button>
                </>
              )}

              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="group relative overflow-hidden border border-blue-100 text-blue-400 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed bg-white"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                <div className="absolute inset-0 bg-blue-50 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-out" />
                <span className="relative">Next →</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default AllAppointments