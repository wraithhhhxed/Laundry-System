import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { toast } from 'react-toastify'
import { X, Plus, MoveUp, MoveDown, Edit3, Trash2 } from 'lucide-react'

const EMPTY_FORM = { question: '', answer: '', active: true }

const FaqSettings = () => {
  const { getFaqs, updateFaqs } = useContext(AdminContext)

  const [faqs, setFaqs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [formErr, setFormErr]     = useState({})

  const load = async () => {
    try {
      setLoading(true)
      const data = await getFaqs()
      setFaqs(data.filter(f => f !== null && f !== undefined))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditIndex(null)
    setForm(EMPTY_FORM)
    setFormErr({})
    setShowModal(true)
  }

  const openEdit = (i) => {
    setEditIndex(i)
    setForm({ question: faqs[i].question, answer: faqs[i].answer, active: faqs[i].active })
    setFormErr({})
    setShowModal(true)
  }

  const validate = () => {
    const err = {}
    if (!form.question.trim()) err.question = 'Question is required'
    if (!form.answer.trim())   err.answer   = 'Answer is required'
    setFormErr(err)
    return Object.keys(err).length === 0
  }

  const handleSaveModal = () => {
    if (!validate()) return
    const updated = [...faqs]
    if (editIndex === null) {
      updated.push({ ...form, order: updated.length })
    } else {
      updated[editIndex] = { ...updated[editIndex], ...form }
    }
    setFaqs(updated)
    setShowModal(false)
  }

  const handleDelete = (i) => {
    if (!window.confirm('Delete this FAQ?')) return
    setFaqs(prev => prev.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, order: idx })))
  }

  const toggleActive = (i) => {
    setFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, active: !f.active } : f))
  }

  const moveOrder = (i, direction) => {
    if ((direction === -1 && i === 0) || (direction === 1 && i === faqs.length - 1)) return
    setFaqs(prev => {
      const arr = [...prev]
      const target = i + direction
      ;[arr[i], arr[target]] = [arr[target], arr[i]]
      return arr.map((f, idx) => ({ ...f, order: idx }))
    })
  }

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      await updateFaqs(faqs)
      toast.success('FAQs saved successfully')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='bg-neutral-50 min-h-screen w-full flex items-center justify-center' style={{ fontFamily: "'Georgia', serif" }}>
        <span className='font-sans text-sm text-neutral-300 uppercase tracking-[0.2em]'>Loading Content…</span>
      </div>
    )
  }

  return (
    <div className='bg-neutral-50 min-h-screen w-full' style={{ fontFamily: "'Georgia', serif" }}>
      
      {/* Violet Panel Header */}
      <div 
        className='bg-violet-600 px-7 py-6 mb-8'
        style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
      >
        <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-1'>
          Public Information
        </p>
        <div className='flex items-center justify-between'>
          <h1 className='font-sans font-black text-white' style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.03em' }}>
            FAQ Settings
          </h1>
          <button 
            onClick={openAdd}
            className='group relative overflow-hidden bg-white/10 border border-white/30 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-2 px-5 py-2.5 transition-transform active:scale-95'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>+ Add Question</span>
          </button>
        </div>
      </div>

      <div className='px-7 pb-10'>
        {/* Table/Grid Container */}
        <div className='bg-white border border-violet-100 overflow-hidden mb-4 shadow-sm'>
          
          {/* Header Row */}
          <div className='grid grid-cols-[3rem_1fr_0.8fr_0.5fr_auto] bg-violet-50 px-7 py-3 border-b border-violet-100'>
            {['#', 'Content', 'Status', 'Order', 'Actions'].map(h => (
              <span key={h} className='uppercase tracking-[0.2em] text-[10px] font-sans font-semibold text-violet-400'>
                {h}
              </span>
            ))}
          </div>

          {faqs.length === 0 ? (
            <div className='py-20 text-center font-sans text-sm text-neutral-300 italic'>
              No frequently asked questions available.
            </div>
          ) : (
            <div className='divide-y divide-violet-50 max-h-[60vh] overflow-y-auto custom-scrollbar'>
              {faqs.map((faq, i) => (
                <div 
                  key={i} 
                  className={`grid grid-cols-[3rem_1fr_0.8fr_0.5fr_auto] items-center px-7 py-5 hover:bg-violet-50 transition-colors ${!faq.active ? 'opacity-50' : ''}`}
                >
                  <span className='font-sans text-xs text-neutral-400'>{(i + 1).toString().padStart(2, '0')}</span>
                  
                  <div className='pr-8'>
                    <p className='font-sans font-black text-sm text-neutral-700 leading-tight mb-1'>{faq.question}</p>
                    <p className='font-sans text-[11px] text-neutral-400 line-clamp-1 italic'>{faq.answer}</p>
                  </div>

                  <button 
                    onClick={() => toggleActive(i)}
                    className={`uppercase tracking-[0.2em] text-[10px] font-sans font-bold border px-2 py-1 w-fit transition-colors ${
                      faq.active 
                        ? 'border-green-200 text-green-600 hover:bg-green-50' 
                        : 'border-neutral-200 text-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {faq.active ? 'Visible' : 'Hidden'}
                  </button>

                  <div className='flex items-center gap-1'>
                    <button onClick={() => moveOrder(i, -1)} disabled={i === 0} className='text-violet-300 hover:text-violet-600 disabled:opacity-10'><MoveUp size={14}/></button>
                    <button onClick={() => moveOrder(i, 1)} disabled={i === faqs.length - 1} className='text-violet-300 hover:text-violet-600 disabled:opacity-10'><MoveDown size={14}/></button>
                  </div>

                  <div className='flex items-center gap-4'>
                    <button onClick={() => openEdit(i)} className='font-sans text-[10px] font-bold uppercase tracking-widest text-violet-500 hover:text-violet-700'>Edit</button>
                    <button onClick={() => handleDelete(i)} className='text-red-300 hover:text-red-500'><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Save Button */}
        <div className='flex justify-end'>
          <button 
            onClick={handleSaveAll}
            disabled={saving}
            className='group relative overflow-hidden bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center justify-center px-8 py-3 disabled:opacity-50'
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className='absolute inset-0 bg-violet-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
            <span className='relative z-10'>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Modern Modal Overlay */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4'>
          <div 
            className='bg-white w-full max-w-lg shadow-2xl'
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            <div 
              className='px-7 py-5'
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.12) 0%, transparent 60%), #7c3aed' }}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='uppercase tracking-[0.35em] text-[10px] text-violet-200 font-sans font-semibold mb-0.5'>Editor</p>
                  <h2 className='font-sans font-black text-white text-lg uppercase tracking-tight'>
                    {editIndex !== null ? 'Modify Question' : 'New FAQ Entry'}
                  </h2>
                </div>
                <button onClick={() => setShowModal(false)} className='text-violet-200 hover:text-white transition-colors'>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className='px-7 py-8 space-y-6'>
              <div>
                <label className='font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 block mb-2'>Public Question</label>
                <input 
                  className={`w-full px-4 py-3 border font-sans text-sm focus:outline-none transition-colors bg-neutral-50 ${formErr.question ? 'border-red-400' : 'border-neutral-100 focus:border-violet-400'}`}
                  value={form.question}
                  onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  placeholder='e.g. What is your return policy?'
                />
              </div>

              <div>
                <label className='font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 block mb-2'>Detailed Answer</label>
                <textarea 
                  rows={4}
                  className={`w-full px-4 py-3 border font-sans text-sm focus:outline-none transition-colors bg-neutral-50 resize-none ${formErr.answer ? 'border-red-400' : 'border-neutral-100 focus:border-violet-400'}`}
                  value={form.answer}
                  onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
                  placeholder='Provide a concise and helpful response...'
                />
              </div>

              <div className='flex items-center gap-3'>
                <input 
                  type='checkbox' 
                  id='faq-active' 
                  checked={form.active} 
                  onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} 
                  className='w-4 h-4 accent-violet-600' 
                />
                <label htmlFor='faq-active' className='font-sans text-xs font-bold uppercase tracking-widest text-neutral-500'>Visible to clients</label>
              </div>
            </div>

            <div className='px-7 pb-8 flex gap-3'>
              <button 
                onClick={() => setShowModal(false)}
                className='flex-1 border border-neutral-200 text-neutral-400 font-sans text-xs tracking-widest uppercase font-bold py-3 transition-colors hover:bg-neutral-50'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveModal}
                className='flex-1 bg-violet-600 text-white font-sans text-xs tracking-widest uppercase font-bold py-3 transition-colors hover:bg-violet-700'
                style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
              >
                {editIndex === null ? 'Add Entry' : 'Update FAQ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FaqSettings