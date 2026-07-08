import { useContext, useState, useRef } from 'react'
import { BranchesContext } from '../../context/BranchesContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

const BRAND      = 'Selfie Wash Laundry'
const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

const normaliseReport = (raw, filterLabel) => {
  const buckets = Array.isArray(raw.summary) ? raw.summary : []
  const summary = buckets.reduce(
    (acc, b) => ({
      grossRevenue:  acc.grossRevenue  + (b.grossTotal      || 0),
      afterDiscount: acc.afterDiscount + (b.discountedTotal || 0),
      vatCollected:  acc.vatCollected  + (b.vatAmount       || 0),
      netRevenue:    acc.netRevenue    + (b.finalAmount      || 0),
      totalDiscount: acc.totalDiscount + (b.totalDiscount   || 0),
      totalCount:    acc.totalCount    + (b.count           || 0),
    }),
    { grossRevenue: 0, afterDiscount: 0, vatCollected: 0, netRevenue: 0, totalDiscount: 0, totalCount: 0 }
  )
  const kgRevenue  = raw.kgRevenue?.totalKgRevenue ?? 0
  const totalKg    = raw.kgRevenue?.totalKg        ?? 0
  const perService = (raw.perService || []).map(r => ({ name: r.name || '—', count: r.count, revenue: r.revenue || 0 }))
  const promos     = (raw.promos    || []).map(r => ({ code: r._id, uses: r.timesUsed, totalDiscount: r.totalDiscount }))
  return { summary, kgRevenue, totalKg, perService, promos, filterLabel }
}

const SectionLabel = ({ children }) => (
  <p className="uppercase tracking-[0.35em] text-[10px] text-violet-400 font-sans mb-2 font-semibold">{children}</p>
)
const Divider = () => <div className="h-px bg-violet-100 mb-6" />

const StatCard = ({ label, value, sub }) => (
  <div className="px-7 py-8 flex flex-col gap-2"
    style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #7c3aed' }}>
    <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold">{label}</p>
    <p className="text-white font-sans font-black"
      style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', lineHeight: 1, letterSpacing: '-0.03em' }}>
      {value}
    </p>
    {sub && <p className="font-sans text-xs text-violet-200 font-medium">{sub}</p>}
  </div>
)

const FILTER_OPTIONS = ['today', 'week', 'month', 'custom']

const BranchSalesReport = () => {
  const { bToken, backendUrl } = useContext(BranchesContext)

  const [filter,  setFilter]  = useState('today')
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [report,  setReport]  = useState(null)
  const [loading, setLoading] = useState(false)

  const printRef = useRef()

  const buildParams = () => {
    const toISO = (d) => d.toISOString().slice(0, 10)
    const now   = new Date()
    if (filter === 'custom') {
      if (!from || !to) { toast.error('Select both From and To dates'); return null }
      return { from, to }
    }
    if (filter === 'today')  { const d = toISO(now); return { preset: 'today', from: d, to: d } }
    if (filter === 'week')   { const day = now.getDay(); const start = new Date(now); start.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); return { preset: 'week', from: toISO(start), to: toISO(now) } }
    if (filter === 'month')  { const start = new Date(now.getFullYear(), now.getMonth(), 1); return { preset: 'month', from: toISO(start), to: toISO(now) } }
    return null
  }

  const fetchReport = async () => {
    const params = buildParams()
    if (!params) return
    setLoading(true)
    try {
      const { data } = await axios.get(`${backendUrl}/api/sales/report`, { headers: authHeader(bToken), params })
      if (data.success) setReport(normaliseReport(data.data, filter))
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>${BRAND} – Sales Report</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;padding:24px}
      h1{font-size:18px;color:#7c3aed;margin-bottom:4px}
      h2{font-size:13px;margin:20px 0 8px;color:#333;border-bottom:1px solid #ede9fe;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#f5f3ff;text-align:left;padding:6px 10px;font-size:11px;text-transform:uppercase;color:#7c3aed}
      td{padding:6px 10px;border-top:1px solid #ede9fe}.right{text-align:right}</style>
      </head><body>${printRef.current?.innerHTML || ''}</body></html>`)
    win.document.close(); win.print()
  }

  const handlePDF = () => {
    if (!report) return
    const { summary: s, kgRevenue, perService, promos } = report
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    doc.setFontSize(16).setTextColor('#7c3aed').text(BRAND, 40, 40)
    doc.setFontSize(11).setTextColor('#333').text('Sales Report', 40, 58)
    doc.setFontSize(9).setTextColor('#9ca3af').text(`Period: ${filter}`, 40, 72)
    doc.setFontSize(11).setTextColor('#333').text('Summary', 40, 96)
    autoTable(doc, {
      startY: 104,
      head: [['Gross Revenue', 'After Discount', 'VAT Collected', 'Net Revenue']],
      body: [[fmt(s.grossRevenue), fmt(s.afterDiscount), fmt(s.vatCollected), fmt(s.netRevenue)]],
      headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 40, right: 40 },
    })
    if (perService.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 18,
        head: [['Service', 'Bookings', 'Revenue']],
        body: perService.map(r => [r.name, r.count, fmt(r.revenue)]),
        headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 40, right: 40 },
      })
    }
    const afterService = doc.lastAutoTable?.finalY ?? 104
    doc.setFontSize(10).setTextColor('#555').text(`KG Revenue: ${fmt(kgRevenue)}`, 40, afterService + 22)
    if (promos.length) {
      autoTable(doc, {
        startY: afterService + 36,
        head: [['Promo Code', 'Uses', 'Discount Given']],
        body: promos.map(r => [r.code, r.uses, fmt(r.totalDiscount)]),
        headStyles: { fillColor: [124, 58, 237], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 40, right: 40 },
      })
    }
    doc.save(`SalesReport-${filter}-${Date.now()}.pdf`)
  }

  const handleCSV = () => {
    if (!report) return
    const { summary: s, kgRevenue, perService, promos } = report
    const rows = [
      [`${BRAND} – SALES REPORT`], [`Period: ${filter}`], [],
      ['=== SUMMARY ==='],
      ['Gross Revenue', fmt(s.grossRevenue)], ['After Discount', fmt(s.afterDiscount)],
      ['VAT Collected', fmt(s.vatCollected)], ['Net Revenue', fmt(s.netRevenue)],
      ['Total Discounts', fmt(s.totalDiscount)], ['Total Appointments', s.totalCount], [],
      ['=== PER SERVICE ==='], ['Service', 'Bookings', 'Revenue'],
      ...perService.map(r => [r.name, r.count, fmt(r.revenue)]), [],
      ['=== KG REVENUE ==='], ['KG Revenue', fmt(kgRevenue)], [],
      ['=== PROMO CODES ==='], ['Code', 'Uses', 'Discount Given'],
      ...promos.map(r => [r.code, r.uses, fmt(r.totalDiscount)]),
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = `SalesReport-${filter}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExcel = async () => {
    if (!report) return
    const { summary: s, kgRevenue, perService, promos } = report
    const wb = new ExcelJS.Workbook(); wb.creator = BRAND
    const hStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }, alignment: { horizontal: 'center' } }
    const titleStyle = { font: { bold: true, size: 13, color: { argb: 'FF7C3AED' } } }
    const ws1 = wb.addWorksheet('Summary')
    ws1.getCell('A1').value = BRAND; ws1.getCell('A1').style = titleStyle
    ws1.getCell('A2').value = `Period: ${filter}`; ws1.addRow([])
    const h1 = ws1.addRow(['Metric', 'Amount']); h1.eachCell(c => { c.style = hStyle })
    ws1.columns = [{ width: 24 }, { width: 18 }]
    ;[['Gross Revenue', fmt(s.grossRevenue)], ['After Discount', fmt(s.afterDiscount)],
      ['VAT Collected', fmt(s.vatCollected)], ['Net Revenue', fmt(s.netRevenue)],
      ['Total Discounts', fmt(s.totalDiscount)], ['Total Appointments', s.totalCount],
    ].forEach(r => ws1.addRow(r))
    if (perService.length) {
      const ws2 = wb.addWorksheet('Per Service')
      ws2.getCell('A1').value = BRAND; ws2.getCell('A1').style = titleStyle; ws2.addRow([])
      const h2 = ws2.addRow(['Service', 'Bookings', 'Revenue']); h2.eachCell(c => { c.style = hStyle })
      ws2.columns = [{ width: 28 }, { width: 12 }, { width: 18 }]
      perService.forEach(r => ws2.addRow([r.name, r.count, fmt(r.revenue)]))
    }
    const ws3 = wb.addWorksheet('KG Revenue')
    ws3.getCell('A1').value = BRAND; ws3.getCell('A1').style = titleStyle; ws3.addRow([])
    const h3 = ws3.addRow(['Category', 'Revenue']); h3.eachCell(c => { c.style = hStyle })
    ws3.columns = [{ width: 20 }, { width: 18 }]; ws3.addRow(['KG Revenue', fmt(kgRevenue)])
    if (promos.length) {
      const ws4 = wb.addWorksheet('Promo Codes')
      ws4.getCell('A1').value = BRAND; ws4.getCell('A1').style = titleStyle; ws4.addRow([])
      const h4 = ws4.addRow(['Code', 'Uses', 'Discount Given']); h4.eachCell(c => { c.style = hStyle })
      ws4.columns = [{ width: 22 }, { width: 10 }, { width: 18 }]
      promos.forEach(r => ws4.addRow([r.code, r.uses, fmt(r.totalDiscount)]))
    }
    const buf  = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = `SalesReport-${filter}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const s          = report?.summary    || {}
  const perService = report?.perService || []
  const promos     = report?.promos     || []
  const kgRevenue  = report?.kgRevenue  ?? 0

  const inputClass = "px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 focus:outline-none focus:border-violet-400 transition-colors bg-white"

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-neutral-50">

      {/* Page header */}
      <div className="px-10 pt-10 pb-12"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-3 font-semibold">Branch Portal</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white font-sans font-black"
              style={{ letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>
              Sales Report
            </h1>
            <p className="font-sans text-sm text-violet-200 mt-2">Revenue overview for your branch</p>
          </div>
          {report && (
            <div className="flex gap-2 flex-wrap">
              {[{ label: 'Print', action: handlePrint }, { label: 'PDF', action: handlePDF },
                { label: 'CSV', action: handleCSV }, { label: 'Excel', action: handleExcel }].map(({ label, action }) => (
                <button key={label} onClick={action}
                  className="group relative overflow-hidden border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                  <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-10 py-10 max-w-7xl mx-auto space-y-10">

        {/* Filter panel */}
        <div>
          <SectionLabel>Filter Period</SectionLabel>
          <Divider />
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-px bg-violet-100">
              {FILTER_OPTIONS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`font-sans text-xs uppercase tracking-[0.2em] font-bold px-5 py-2.5 transition-colors capitalize ${
                    filter === f ? 'bg-violet-600 text-white' : 'bg-white text-neutral-400 hover:text-violet-600'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            {filter === 'custom' && (
              <>
                <div><SectionLabel>From</SectionLabel><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} /></div>
                <div><SectionLabel>To</SectionLabel><input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} /></div>
              </>
            )}
            <button onClick={fetchReport} disabled={loading}
              className="group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-7 py-2.5 disabled:opacity-50"
              style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <div className="absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              <span className="relative">{loading ? 'Loading...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!report && !loading && (
          <div className="border border-violet-100 bg-white flex flex-col items-center justify-center py-24 gap-4">
            <svg className="w-10 h-10 text-violet-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-sans text-xs uppercase tracking-[0.3em] text-neutral-300 font-semibold">
              Select a period and generate a report
            </p>
          </div>
        )}

        {/* Report output */}
        {report && (
          <div ref={printRef} className="space-y-10">

            {/* Summary cards — always violet, gap-3 for visible separation */}
            <div>
              <SectionLabel>Summary</SectionLabel>
              <Divider />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Gross Revenue"  value={fmt(s.grossRevenue)} />
                <StatCard label="After Discount" value={fmt(s.afterDiscount)} />
                <StatCard label="VAT Collected"  value={fmt(s.vatCollected)} />
                <StatCard label="Net Revenue"    value={fmt(s.netRevenue)} />
              </div>
            </div>

            {/* Period breakdown — violet cards, gap-3 */}
            <div>
              <SectionLabel>Period Breakdown</SectionLabel>
              <Divider />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Appointments', value: s.totalCount ?? 0 },
                  { label: 'Total Discounts',    value: fmt(s.totalDiscount) },
                  { label: 'KG Revenue',         value: fmt(kgRevenue) },
                ].map(({ label, value }) => (
                  <div key={label} className="px-7 py-6"
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #7c3aed' }}>
                    <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-2">{label}</p>
                    <p className="font-sans font-black text-white text-2xl" style={{ letterSpacing: '-0.03em' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Per Service */}
            {perService.length > 0 && (
              <div>
                <SectionLabel>Revenue by Service</SectionLabel>
                <Divider />
                <div className="bg-white border border-violet-100 divide-y divide-violet-50">
                  <div className="grid grid-cols-3 px-7 py-3 bg-violet-50">
                    {['Service', 'Bookings', 'Revenue'].map((h, i) => (
                      <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {perService.map((r, i) => (
                    <div key={i} className="grid grid-cols-3 items-center px-7 py-4 hover:bg-violet-50 transition-colors">
                      <p className="font-sans text-sm font-semibold text-neutral-800">{r.name}</p>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{r.count}</p>
                      <p className="font-sans text-sm font-black text-violet-900 text-right">{fmt(r.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Codes */}
            {promos.length > 0 && (
              <div>
                <SectionLabel>Promo Code Usage</SectionLabel>
                <Divider />
                <div className="bg-white border border-violet-100 divide-y divide-violet-50">
                  <div className="grid grid-cols-3 px-7 py-3 bg-violet-50">
                    {['Code', 'Uses', 'Discount Given'].map((h, i) => (
                      <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {promos.map((r, i) => (
                    <div key={i} className="grid grid-cols-3 items-center px-7 py-4 hover:bg-violet-50 transition-colors">
                      <span className="font-sans text-xs font-black text-violet-700 uppercase tracking-[0.15em] bg-violet-50 border border-violet-100 px-2 py-0.5 inline-block w-fit">
                        {r.code}
                      </span>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{r.uses}</p>
                      <p className="font-sans text-sm font-black text-violet-900 text-right">{fmt(r.totalDiscount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

export default BranchSalesReport