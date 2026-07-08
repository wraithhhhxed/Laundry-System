import React, { useState, useContext, useRef, useCallback, useMemo } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import axios from 'axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().split('T')[0]

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

// ── Highlight Card ─────────────────────────────────────────────────────────────
const HighlightCard = ({ icon, badge, badgeColor, title, value, sub, accent }) => (
  <div className={`bg-white border ${accent || 'border-violet-100'} px-6 py-6 flex flex-col gap-3 relative overflow-hidden`}>
    <div className="flex items-start justify-between gap-2">
      <span className="text-2xl">{icon}</span>
      <span className={`font-sans text-[9px] uppercase tracking-[0.25em] font-black px-2 py-1 ${badgeColor}`}>
        {badge}
      </span>
    </div>
    <div>
      <p className="uppercase tracking-[0.25em] text-[9px] text-neutral-400 font-sans font-semibold mb-1">{title}</p>
      <p className="font-sans font-black text-neutral-900 leading-tight" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p className="font-sans text-xs text-neutral-400 mt-1">{sub}</p>}
    </div>
    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${accent?.replace('border-', 'bg-') || 'bg-violet-200'}`} />
  </div>
)

const FILTER_OPTIONS = ['today', 'week', 'month', 'custom']

const SalesReport = () => {
  const { backendUrl, aToken, role } = useContext(AdminContext)
  const isAdmin = role === 'admin'

  const [preset,      setPreset]      = useState('month')
  const [from,        setFrom]        = useState(today())
  const [to,          setTo]          = useState(today())
  const [branchId,    setBranchId]    = useState('')
  const [report,      setReport]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [pdfLoading,  setPdfLoading]  = useState(false)
  const reportRef = useRef()

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = { preset: preset === 'custom' ? undefined : preset }
      if (preset === 'custom') { params.from = from; params.to = to }
      if (isAdmin && branchId) params.branchId = branchId
      const { data } = await axios.get(`${backendUrl}/api/sales/report`, {
        params, headers: { token: aToken },
      })
      if (data.success) setReport(data.data)
      else toast.error(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }, [preset, from, to, branchId, backendUrl, aToken, isAdmin])

  const totals = report?.summary?.reduce(
    (acc, row) => ({
      gross:      acc.gross      + (row.grossTotal      || 0),
      discounted: acc.discounted + (row.discountedTotal || 0),
      vat:        acc.vat        + (row.vatAmount       || 0),
      final:      acc.final      + (row.finalAmount     || 0),
      discount:   acc.discount   + (row.totalDiscount   || 0),
      count:      acc.count      + (row.count           || 0),
    }),
    { gross: 0, discounted: 0, vat: 0, final: 0, discount: 0, count: 0 }
  ) ?? null

  // ── Computed highlights ─────────────────────────────────────────────────────
  const highlights = useMemo(() => {
    if (!report) return null

    // Best & Worst Branch
    const branches = report.perBranch || []
    const bestBranch  = branches.length ? [...branches].sort((a, b) => (b.finalAmount || 0) - (a.finalAmount || 0))[0] : null
    const worstBranch = branches.length > 1 ? [...branches].sort((a, b) => (a.finalAmount || 0) - (b.finalAmount || 0))[0] : null

    // Best Performing Service
    const services   = report.perService || []
    const bestService = services.length ? [...services].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0] : null

    // Best Promo Code (most used)
    const promos    = report.promos || []
    const bestPromo = promos.length ? [...promos].sort((a, b) => (b.timesUsed || 0) - (a.timesUsed || 0))[0] : null

    // Best Period/Day
    const summary    = report.summary || []
    const bestPeriod = summary.length ? [...summary].sort((a, b) => (b.finalAmount || 0) - (a.finalAmount || 0))[0] : null
    const bestPeriodLabel = bestPeriod ? (() => {
      const id = bestPeriod._id
      if (id.h != null) return `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')} ${String(id.h).padStart(2,'0')}:00`
      if (id.d != null) return `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')}`
      return `${id.y}-${String(id.m).padStart(2,'0')}`
    })() : null

    return { bestBranch, worstBranch, bestService, bestPromo, bestPeriod, bestPeriodLabel }
  }, [report])

  const periodLabel = () => {
    if (preset === 'today') return 'Today'
    if (preset === 'week')  return 'This Week'
    if (preset === 'month') return 'This Month'
    return `${from} → ${to}`
  }

  const handleDownloadPDF = async () => {
    if (!report) return
    setPdfLoading(true)
    try {
      const VIOLET = [124, 58, 237]; const VLIGHT = [237, 233, 254]
      const DARK   = [30, 30, 50];   const GRAY   = [120, 120, 140]; const WHITE = [255, 255, 255]
      const label  = periodLabel()
      const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W      = doc.internal.pageSize.getWidth()

      const addPageDecor = () => {
        doc.setFillColor(...VIOLET); doc.rect(0, 0, W, 18, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...WHITE)
        doc.text('Selfie Wash Laundry', 14, 11)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
        doc.text('Sales Report', W - 14, 11, { align: 'right' })
        doc.setFillColor(...VLIGHT); doc.rect(0, 287, W, 10, 'F')
        doc.setFontSize(7); doc.setTextColor(...GRAY)
        doc.text('Selfie Wash Laundry  •  Confidential', 14, 293)
        doc.text('Page ' + doc.internal.getCurrentPageInfo().pageNumber, W - 14, 293, { align: 'right' })
      }
      addPageDecor()
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...DARK); doc.text('Sales Report', 14, 32)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
      doc.text('Period: ' + label, 14, 38); doc.text('Generated: ' + new Date().toLocaleString('en-PH'), 14, 43)
      doc.setDrawColor(...VIOLET); doc.setLineWidth(0.5); doc.line(14, 46, W - 14, 46)
      let y = 52

      const sectionHeader = (title) => {
        if (y > 255) { doc.addPage(); addPageDecor(); y = 28 }
        doc.setFillColor(...VLIGHT); doc.roundedRect(14, y, W - 28, 8, 1, 1, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...VIOLET)
        doc.text(title.toUpperCase(), 17, y + 5.5); y += 12
      }
      const drawTable = (head, body) => {
        autoTable(doc, {
          startY: y, head: [head], body,
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK },
          headStyles: { fillColor: VIOLET, textColor: WHITE, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 248, 255] },
          didDrawPage: addPageDecor,
          tableLineColor: [220, 220, 235], tableLineWidth: 0.1,
        })
        y = doc.lastAutoTable.finalY + 8
      }

      if (totals) {
        sectionHeader('Summary')
        const cards = [
          ['Gross Sales', peso(totals.gross)], ['After Discount', peso(totals.discounted)],
          ['VAT Collected', peso(totals.vat)], ['Net Revenue', peso(totals.final)],
          ['Total Discount', peso(totals.discount)], ['Appointments', String(totals.count)],
        ]
        const cardW = (W - 28 - 10) / 3
        cards.forEach(([lbl, val], i) => {
          const cx = 14 + (i % 3) * (cardW + 5); const cy = y + Math.floor(i / 3) * 18
          doc.setFillColor(...WHITE); doc.setDrawColor(...VIOLET); doc.setLineWidth(0.3)
          doc.roundedRect(cx, cy, cardW, 14, 1, 1, 'FD')
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY); doc.text(lbl, cx + 3, cy + 5)
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK); doc.text(val, cx + 3, cy + 11)
        })
        y += 44
      }

      // Highlights in PDF
      if (highlights) {
        sectionHeader('Highlights')
        const hlRows = []
        if (highlights.bestBranch)  hlRows.push([' Best Branch',    highlights.bestBranch.branchData?.name  || highlights.bestBranch._id,  peso(highlights.bestBranch.finalAmount)])
        if (highlights.worstBranch) hlRows.push([' Needs Attention', highlights.worstBranch.branchData?.name || highlights.worstBranch._id, peso(highlights.worstBranch.finalAmount)])
        if (highlights.bestService) hlRows.push([' Top Service',     highlights.bestService.name,                                           peso(highlights.bestService.revenue)])
        if (highlights.bestPromo)   hlRows.push([' Top Promo',       highlights.bestPromo._id,                                              `${highlights.bestPromo.timesUsed} uses`])
        if (highlights.bestPeriod)  hlRows.push([' Best Period',      highlights.bestPeriodLabel,                                            peso(highlights.bestPeriod.finalAmount)])
        if (hlRows.length) drawTable(['Category', 'Name', 'Value'], hlRows)
      }

      if (report.perBranch?.length) {
        sectionHeader('Per Branch Breakdown')
        drawTable(['Branch', 'Appointments', 'Gross', 'VAT', 'Final'],
          report.perBranch.map(r => [r.branchData?.name || r._id, r.count, peso(r.grossTotal), peso(r.vatAmount), peso(r.finalAmount)]))
      }
      if (report.perService?.length) {
        sectionHeader('Per Service Breakdown')
        drawTable(['Service', 'Times Booked', 'Unit Price', 'Revenue'],
          report.perService.map(r => [r.name, r.count, peso(r.price), peso(r.revenue)]))
      }
      if (report.kgRevenue) {
        sectionHeader('KG Rate Revenue')
        drawTable(['Total KG Revenue', 'Total KG Processed', 'Avg KG Charge / Appointment'],
          [[peso(report.kgRevenue.totalKgRevenue), report.kgRevenue.totalKg + ' kg', peso(report.kgRevenue.avgKgPrice)]])
      }
      if (report.promos?.length) {
        sectionHeader('Promo Code Usage')
        drawTable(['Code', 'Type', 'Value', 'Times Used', 'Total Discount', 'Total Final'],
          report.promos.map(r => [r._id, r.discountType, r.discountType === 'percent' ? r.discountValue + '%' : peso(r.discountValue), r.timesUsed, peso(r.totalDiscount), peso(r.totalFinal)]))
      }
      if (report.summary?.length) {
        sectionHeader('Period Summary')
        drawTable(['Period', 'Orders', 'Gross', 'Discount', 'VAT', 'Final'],
          report.summary.map(r => {
            const id = r._id
            const lbl = id.h != null
              ? `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')} ${String(id.h).padStart(2,'0')}:00`
              : id.d != null ? `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')}`
              : `${id.y}-${String(id.m).padStart(2,'0')}`
            return [lbl, r.count, peso(r.grossTotal), peso(r.totalDiscount), peso(r.vatAmount), peso(r.finalAmount)]
          }))
      }
      const blob = doc.output('blob'); window.open(URL.createObjectURL(blob), '_blank')
    } catch (e) { console.error(e); toast.error('PDF generation failed') }
    finally { setPdfLoading(false) }
  }

  const handleExportCSV = () => {
    if (!report) return
    const lines = []
    const addSection = (title, headers, rows) => {
      lines.push(title); lines.push(headers.join(','))
      rows.forEach(r => lines.push(r.map(v => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v ?? '')).join(',')))
      lines.push('')
    }
    if (totals) addSection('SUMMARY', ['gross','after_discount','vat','final','total_discount','appointments'], [[totals.gross, totals.discounted, totals.vat, totals.final, totals.discount, totals.count]])
    if (highlights?.bestBranch)  addSection('HIGHLIGHTS - BEST BRANCH',  ['name','final_amount'], [[highlights.bestBranch.branchData?.name || highlights.bestBranch._id, highlights.bestBranch.finalAmount]])
    if (highlights?.bestService) addSection('HIGHLIGHTS - TOP SERVICE',   ['name','revenue'],      [[highlights.bestService.name, highlights.bestService.revenue]])
    if (highlights?.bestPromo)   addSection('HIGHLIGHTS - TOP PROMO',     ['code','times_used'],   [[highlights.bestPromo._id, highlights.bestPromo.timesUsed]])
    if (report.perBranch?.length) addSection('PER BRANCH', ['branch','appointments','gross','vat','final'], report.perBranch.map(r => [r.branchData?.name || r._id, r.count, r.grossTotal, r.vatAmount, r.finalAmount]))
    if (report.perService?.length) addSection('PER SERVICE', ['service','times_booked','unit_price','revenue'], report.perService.map(r => [r.name, r.count, r.price, r.revenue]))
    if (report.kgRevenue) addSection('KG REVENUE', ['total_kg_revenue','total_kg','avg_kg_charge'], [[report.kgRevenue.totalKgRevenue, report.kgRevenue.totalKg, report.kgRevenue.avgKgPrice]])
    if (report.promos?.length) addSection('PROMO CODES', ['code','type','value','times_used','total_discount','total_final'], report.promos.map(r => [r._id, r.discountType, r.discountValue, r.timesUsed, r.totalDiscount, r.totalFinal]))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `selfie-wash-sales-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const handleExportExcel = async () => {
    if (!report) return
    const VIOLET = 'FF7C3AED'; const VLIGHT = 'FFEDE9FE'; const WHITE = 'FFFFFFFF'; const DARK = 'FF1E1E32'; const GRAY = 'FF787890'
    const wb = new ExcelJS.Workbook(); wb.creator = 'Selfie Wash Laundry'; wb.created = new Date()
    const label = periodLabel()
    const addSheet = (name, headers, rows) => {
      const ws = wb.addWorksheet(name)
      ws.mergeCells('A1', String.fromCharCode(64 + headers.length) + '1')
      const tc = ws.getCell('A1'); tc.value = 'Selfie Wash Laundry — Sales Report'
      tc.font = { name: 'Calibri', size: 14, bold: true, color: { argb: WHITE } }
      tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET } }
      tc.alignment = { horizontal: 'center', vertical: 'middle' }; ws.getRow(1).height = 28
      ws.mergeCells('A2', String.fromCharCode(64 + headers.length) + '2')
      const sc = ws.getCell('A2'); sc.value = label + '  •  Generated: ' + new Date().toLocaleString('en-PH')
      sc.font = { name: 'Calibri', size: 9, italic: true, color: { argb: GRAY } }
      sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VLIGHT } }
      sc.alignment = { horizontal: 'center' }; ws.getRow(2).height = 16
      ws.addRow([])
      const headerRow = ws.addRow(headers)
      headerRow.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { top: { style: 'thin', color: { argb: WHITE } }, bottom: { style: 'thin', color: { argb: WHITE } }, left: { style: 'thin', color: { argb: WHITE } }, right: { style: 'thin', color: { argb: WHITE } } }
      }); headerRow.height = 20
      rows.forEach((row, i) => {
        const dr = ws.addRow(row); const isAlt = i % 2 === 1
        dr.eachCell({ includeEmpty: true }, cell => {
          cell.font = { name: 'Calibri', size: 10, color: { argb: DARK } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? VLIGHT : WHITE } }
          cell.alignment = { horizontal: typeof cell.value === 'number' ? 'right' : 'left', vertical: 'middle' }
          cell.border = { bottom: { style: 'hair', color: { argb: 'FFD0D0E8' } }, right: { style: 'hair', color: { argb: 'FFD0D0E8' } } }
        }); dr.height = 18
      })
      ws.columns.forEach(col => { let max = 12; col.eachCell({ includeEmpty: false }, cell => { const len = String(cell.value ?? '').length; if (len > max) max = len }); col.width = Math.min(max + 4, 40) })
    }
    if (totals) addSheet('Summary', ['Metric','Value'], [['Gross Sales',peso(totals.gross)],['After Discount',peso(totals.discounted)],['VAT Collected',peso(totals.vat)],['Net Revenue',peso(totals.final)],['Total Discount',peso(totals.discount)],['Appointments',totals.count]])
    if (highlights) addSheet('Highlights', ['Category','Name','Value'], [
      ...(highlights.bestBranch  ? [['Best Branch',    highlights.bestBranch.branchData?.name  || highlights.bestBranch._id,  peso(highlights.bestBranch.finalAmount)]]  : []),
      ...(highlights.worstBranch ? [['Needs Attention', highlights.worstBranch.branchData?.name || highlights.worstBranch._id, peso(highlights.worstBranch.finalAmount)]] : []),
      ...(highlights.bestService ? [['Top Service',    highlights.bestService.name,                                            peso(highlights.bestService.revenue)]]     : []),
      ...(highlights.bestPromo   ? [['Top Promo Code', highlights.bestPromo._id,                                               highlights.bestPromo.timesUsed + ' uses']] : []),
      ...(highlights.bestPeriod  ? [['Best Period',    highlights.bestPeriodLabel,                                             peso(highlights.bestPeriod.finalAmount)]]  : []),
    ])
    if (report.perBranch?.length) addSheet('Per Branch', ['Branch','Appointments','Gross','VAT','Final'], report.perBranch.map(r => [r.branchData?.name || r._id, r.count, peso(r.grossTotal), peso(r.vatAmount), peso(r.finalAmount)]))
    if (report.perService?.length) addSheet('Per Service', ['Service','Times Booked','Unit Price','Revenue'], report.perService.map(r => [r.name, r.count, peso(r.price), peso(r.revenue)]))
    if (report.kgRevenue) addSheet('KG Revenue', ['Total KG Revenue','Total KG','Avg KG Charge'], [[peso(report.kgRevenue.totalKgRevenue), report.kgRevenue.totalKg + ' kg', peso(report.kgRevenue.avgKgPrice)]])
    if (report.promos?.length) addSheet('Promo Codes', ['Code','Type','Value','Times Used','Total Discount','Total Final'], report.promos.map(r => [r._id, r.discountType, r.discountType === 'percent' ? r.discountValue + '%' : peso(r.discountValue), r.timesUsed, peso(r.totalDiscount), peso(r.totalFinal)]))
    if (report.summary?.length) addSheet('Period Summary', ['Period','Orders','Gross','Discount','VAT','Final'], report.summary.map(r => {
      const id = r._id; const lbl = id.h != null ? `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')} ${String(id.h).padStart(2,'0')}:00` : id.d != null ? `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')}` : `${id.y}-${String(id.m).padStart(2,'0')}`
      return [lbl, r.count, peso(r.grossTotal), peso(r.totalDiscount), peso(r.vatAmount), peso(r.finalAmount)]
    }))
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `selfie-wash-sales-${Date.now()}.xlsx`; a.click(); URL.revokeObjectURL(a.href)
  }

  const inputClass = "px-4 py-2.5 border border-violet-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-violet-400 transition-colors bg-white"

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className="min-h-screen bg-neutral-50">

      {/* Violet panel header */}
      <div className="px-10 pt-10 pb-12"
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}>
        <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans mb-3 font-semibold">All Branches</p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white font-sans font-black"
              style={{ letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1 }}>
              Sales Report
            </h1>
            {report && <p className="font-sans text-sm text-violet-200 mt-2">{periodLabel()}</p>}
          </div>
          {report && (
            <div className="flex gap-2 flex-wrap print:hidden">
              {[
                { label: 'Print',  action: () => window.print() },
                { label: 'PDF',    action: handleDownloadPDF, disabled: pdfLoading, altLabel: 'Generating...' },
                { label: 'CSV',    action: handleExportCSV },
                { label: 'Excel',  action: handleExportExcel },
              ].map(({ label, action, disabled, altLabel }) => (
                <button key={label} onClick={action} disabled={disabled}
                  className="group relative overflow-hidden border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center px-4 py-2.5 disabled:opacity-60"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                  <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
                  <span className="relative">{disabled ? altLabel : label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-10 py-10 max-w-7xl mx-auto space-y-10">

        {/* Filter panel */}
        <div className="print:hidden">
          <SectionLabel>Filter Period</SectionLabel>
          <Divider />
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-px bg-violet-100">
              {FILTER_OPTIONS.map(f => (
                <button key={f} onClick={() => setPreset(f)}
                  className={`font-sans text-xs uppercase tracking-[0.2em] font-bold px-5 py-2.5 transition-colors capitalize ${
                    preset === f ? 'bg-violet-600 text-white' : 'bg-white text-neutral-400 hover:text-violet-600'
                  }`}>
                  {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
                </button>
              ))}
            </div>

            {preset === 'custom' && (
              <>
                <div><SectionLabel>From</SectionLabel><input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className={inputClass} /></div>
                <div><SectionLabel>To</SectionLabel><input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className={inputClass} /></div>
              </>
            )}

            {isAdmin && (
              <div>
                <SectionLabel>Branch ID</SectionLabel>
                <input type="text" placeholder="Optional" value={branchId} onChange={e => setBranchId(e.target.value)} className={inputClass} />
              </div>
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
          <div ref={reportRef} className="space-y-10">

            {/* Summary cards */}
            {totals && (
              <div>
                <SectionLabel>Summary</SectionLabel>
                <Divider />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Gross Sales"    value={peso(totals.gross)}      sub={`${totals.count} appointment${totals.count !== 1 ? 's' : ''}`} />
                  <StatCard label="After Discount" value={peso(totals.discounted)} sub={`Discount: ${peso(totals.discount)}`} />
                  <StatCard label="VAT Collected"  value={peso(totals.vat)}        sub="Post-discount VAT" />
                  <StatCard label="Net Revenue"    value={peso(totals.final)}      sub="Charged to customers" />
                </div>
              </div>
            )}

            {/* ── HIGHLIGHTS ─────────────────────────────────────────────── */}
            {highlights && (highlights.bestBranch || highlights.bestService || highlights.bestPromo || highlights.bestPeriod) && (
              <div>
                <SectionLabel>Highlights</SectionLabel>
                <Divider />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {/* Best Branch */}
                  {highlights.bestBranch && (
                    <HighlightCard
                      icon=""
                      badge="Best Branch"
                      badgeColor="bg-amber-50 text-amber-600 border border-amber-200"
                      title="Highest Revenue Branch"
                      value={highlights.bestBranch.branchData?.name || highlights.bestBranch._id}
                      sub={`${peso(highlights.bestBranch.finalAmount)} · ${highlights.bestBranch.count} appointments`}
                      accent="border-amber-200"
                    />
                  )}

                  {/* Worst Branch */}
                  {highlights.worstBranch && (
                    <HighlightCard
                      icon=""
                      badge="Needs Attention"
                      badgeColor="bg-red-50 text-red-500 border border-red-200"
                      title="Lowest Revenue Branch"
                      value={highlights.worstBranch.branchData?.name || highlights.worstBranch._id}
                      sub={`${peso(highlights.worstBranch.finalAmount)} · ${highlights.worstBranch.count} appointments`}
                      accent="border-red-200"
                    />
                  )}

                  {/* Best Service */}
                  {highlights.bestService && (
                    <HighlightCard
                      icon=""
                      badge="Top Service"
                      badgeColor="bg-violet-50 text-violet-600 border border-violet-200"
                      title="Highest Revenue Service"
                      value={highlights.bestService.name}
                      sub={`${peso(highlights.bestService.revenue)} · booked ${highlights.bestService.count}×`}
                      accent="border-violet-200"
                    />
                  )}

                  {/* Best Promo */}
                  {highlights.bestPromo && (
                    <HighlightCard
                      icon=""
                      badge="Top Promo"
                      badgeColor="bg-green-50 text-green-600 border border-green-200"
                      title="Most Used Promo Code"
                      value={highlights.bestPromo._id}
                      sub={`Used ${highlights.bestPromo.timesUsed}× · ${peso(highlights.bestPromo.totalDiscount)} total discount`}
                      accent="border-green-200"
                    />
                  )}

                  {/* Best Period */}
                  {highlights.bestPeriod && (
                    <HighlightCard
                      icon=""
                      badge="Best Period"
                      badgeColor="bg-blue-50 text-blue-600 border border-blue-200"
                      title="Highest Revenue Period"
                      value={highlights.bestPeriodLabel}
                      sub={`${peso(highlights.bestPeriod.finalAmount)} · ${highlights.bestPeriod.count} orders`}
                      accent="border-blue-200"
                    />
                  )}

                </div>
              </div>
            )}

            {/* Per Branch — admin only */}
            {isAdmin && report.perBranch?.length > 0 && (
              <div>
                <SectionLabel>Per Branch Breakdown</SectionLabel>
                <Divider />
                <div className="bg-white border border-violet-100 divide-y divide-violet-50">
                  <div className="grid grid-cols-5 px-7 py-3 bg-violet-50">
                    {['Branch', 'Appointments', 'Gross', 'VAT', 'Final'].map((h, i) => (
                      <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {report.perBranch.map((r, i) => (
                    <div key={i} className={`grid grid-cols-5 items-center px-7 py-4 hover:bg-violet-50 transition-colors ${highlights?.bestBranch?._id === r._id ? 'bg-amber-50/50' : ''}`}>
                      <p className="font-sans text-sm font-semibold text-neutral-800 flex items-center gap-2">
                        {highlights?.bestBranch?._id === r._id && <span className="text-amber-500 text-xs">🏆</span>}
                        {highlights?.worstBranch?._id === r._id && <span className="text-red-400 text-xs">📉</span>}
                        {r.branchData?.name || r._id}
                      </p>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{r.count}</p>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{peso(r.grossTotal)}</p>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{peso(r.vatAmount)}</p>
                      <p className="font-sans text-sm font-black text-violet-900 text-right">{peso(r.finalAmount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per Service */}
            {report.perService?.length > 0 && (
              <div>
                <SectionLabel>Per Service Breakdown</SectionLabel>
                <Divider />
                <div className="bg-white border border-violet-100 divide-y divide-violet-50">
                  <div className="grid grid-cols-4 px-7 py-3 bg-violet-50">
                    {['Service', 'Times Booked', 'Unit Price', 'Revenue'].map((h, i) => (
                      <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {report.perService.map((r, i) => (
                    <div key={i} className={`grid grid-cols-4 items-center px-7 py-4 hover:bg-violet-50 transition-colors ${highlights?.bestService?.name === r.name ? 'bg-violet-50/60' : ''}`}>
                      <p className="font-sans text-sm font-semibold text-neutral-800 flex items-center gap-2">
                        {highlights?.bestService?.name === r.name && <span className="text-violet-500 text-xs"></span>}
                        {r.name}
                      </p>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{r.count}</p>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{peso(r.price)}</p>
                      <p className="font-sans text-sm font-black text-violet-900 text-right">{peso(r.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KG Revenue */}
            {report.kgRevenue && (
              <div>
                <SectionLabel>KG Rate Revenue</SectionLabel>
                <Divider />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total KG Revenue',              value: peso(report.kgRevenue.totalKgRevenue) },
                    { label: 'Total KG Processed',            value: (report.kgRevenue.totalKg ?? '—') + ' kg' },
                    { label: 'Avg KG Charge / Appointment',   value: peso(report.kgRevenue.avgKgPrice) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-7 py-6"
                      style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, transparent 60%), #7c3aed' }}>
                      <p className="uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-2">{label}</p>
                      <p className="font-sans font-black text-white text-2xl" style={{ letterSpacing: '-0.03em' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Codes */}
            {report.promos?.length > 0 && (
              <div>
                <SectionLabel>Promo Code Usage</SectionLabel>
                <Divider />
                <div className="bg-white border border-violet-100 divide-y divide-violet-50">
                  <div className="grid grid-cols-5 px-7 py-3 bg-violet-50">
                    {['Code', 'Type', 'Times Used', 'Total Discount', 'Total Final'].map((h, i) => (
                      <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {report.promos.map((r, i) => (
                    <div key={i} className={`grid grid-cols-5 items-center px-7 py-4 hover:bg-violet-50 transition-colors ${highlights?.bestPromo?._id === r._id ? 'bg-green-50/40' : ''}`}>
                      <span className="font-sans text-xs font-black text-violet-700 uppercase tracking-[0.15em] bg-violet-50 border border-violet-100 px-2 py-0.5 inline-flex items-center gap-1.5 w-fit">
                        {highlights?.bestPromo?._id === r._id && <span className="text-green-500"></span>}
                        {r._id}
                      </span>
                      <div className="text-right">
                        <span className={`inline-block border px-2 py-0.5 uppercase tracking-[0.2em] text-[10px] font-sans font-bold ${
                          r.discountType === 'percent'
                            ? 'border-blue-200 bg-blue-50 text-blue-600'
                            : 'border-green-200 bg-green-50 text-green-600'
                        }`}>
                          {r.discountType === 'percent' ? `${r.discountValue}%` : peso(r.discountValue)} off
                        </span>
                      </div>
                      <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{r.timesUsed}</p>
                      <p className="font-sans text-sm font-semibold text-red-400 text-right">{peso(r.totalDiscount)}</p>
                      <p className="font-sans text-sm font-black text-violet-900 text-right">{peso(r.totalFinal)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Period Summary */}
            {report.summary?.length > 0 && (
              <div>
                <SectionLabel>Period Summary</SectionLabel>
                <Divider />
                <div className="bg-white border border-violet-100 divide-y divide-violet-50">
                  <div className="grid grid-cols-6 px-7 py-3 bg-violet-50">
                    {['Period', 'Orders', 'Gross', 'Discount', 'VAT', 'Final'].map((h, i) => (
                      <p key={h} className={`font-sans text-[10px] uppercase tracking-[0.3em] text-violet-400 font-bold ${i > 0 ? 'text-right' : ''}`}>{h}</p>
                    ))}
                  </div>
                  {report.summary.map((r, i) => {
                    const id = r._id
                    const lbl = id.h != null
                      ? `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')} ${String(id.h).padStart(2,'0')}:00`
                      : id.d != null ? `${id.y}-${String(id.m).padStart(2,'0')}-${String(id.d).padStart(2,'0')}`
                      : `${id.y}-${String(id.m).padStart(2,'0')}`
                    const isBest = highlights?.bestPeriodLabel === lbl
                    return (
                      <div key={i} className={`grid grid-cols-6 items-center px-7 py-4 hover:bg-violet-50 transition-colors ${isBest ? 'bg-blue-50/40' : ''}`}>
                        <p className="font-sans text-xs font-semibold text-neutral-600 flex items-center gap-1.5">
                          {isBest && <span className="text-blue-500"></span>}
                          {lbl}
                        </p>
                        <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{r.count}</p>
                        <p className="font-sans text-sm font-semibold text-neutral-500 text-right">{peso(r.grossTotal)}</p>
                        <p className="font-sans text-sm font-semibold text-red-400 text-right">{peso(r.totalDiscount)}</p>
                        <p className="font-sans text-sm font-semibold text-amber-500 text-right">{peso(r.vatAmount)}</p>
                        <p className="font-sans text-sm font-black text-violet-900 text-right">{peso(r.finalAmount)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

export default SalesReport