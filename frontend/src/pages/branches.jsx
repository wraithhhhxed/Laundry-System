import React, { useContext, useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const serviceItemSuggestions = {
  'Wash and Dry': [
    { label: 'Everyday Clothes', items: ['T-shirts', 'Jeans', 'Underwear', 'Socks', 'Casual tops'] },
    { label: 'Beddings', items: ['Bed sheets', 'Pillowcases', 'Blankets'] },
    { label: 'Gym Wear', items: ['Workout shirts', 'Shorts', 'Leggings', 'Sports bra'] },
  ],
  'Dry Clean': [
    { label: 'Formal Wear', items: ['Suits', 'Blazers', 'Dress shirts', 'Ties'] },
    { label: 'Delicates', items: ['Silk blouses', 'Evening gowns', 'Wool coats'] },
  ],
  'Iron Only': [
    { label: 'Office Wear', items: ['Dress shirts', 'Slacks', 'Blouses'] },
    { label: 'School Uniforms', items: ['Polo shirts', 'Pants', 'Skirts'] },
  ],
  'Fold Only': [
    { label: 'Clean Clothes', items: ['Shirts', 'Pants', 'Towels', 'Linens'] },
  ],
}

// Normalize: lowercase, strip spaces and ampersands for loose matching
const normalize = (str) => str?.toLowerCase().replace(/[\s&]/g, '') ?? ''

const Branches = () => {
  const { speciality } = useParams()
  const [filterbranches, setFilterbranches] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const { branches } = useContext(AppContext)

  // Dynamically derive unique specialities from branches data
  const allSpecialities = useMemo(() => {
    if (!branches) return []
    const set = new Set()
    branches.forEach(branch => {
      const specs = Array.isArray(branch.speciality) ? branch.speciality : [branch.speciality]
      specs.forEach(s => s && set.add(s))
    })
    return [...set].sort()
  }, [branches])

  // Sync URL param → sidebar checkbox on mount / param change
  useEffect(() => {
    if (speciality) {
      setSelectedFilters([speciality])
    } else {
      setSelectedFilters([])
    }
  }, [speciality])

  const applyFilter = () => {
    let result = branches.filter(branch => branch.available)

    if (selectedFilters.length > 0) {
      result = result.filter(branch =>
        selectedFilters.some(filter =>
          (Array.isArray(branch.speciality) ? branch.speciality : [branch.speciality])
            .some(s => normalize(s) === normalize(filter))
        )
      )
    } else if (speciality) {
      // fallback: no checkboxes but param present
      result = result.filter(branch =>
        (Array.isArray(branch.speciality) ? branch.speciality : [branch.speciality])
          .some(s => normalize(s) === normalize(speciality))
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(branch =>
        branch.name.toLowerCase().includes(q) ||
        (Array.isArray(branch.speciality)
          ? branch.speciality.some(s => s.toLowerCase().includes(q))
          : branch.speciality?.toLowerCase().includes(q))
      )
    }

    setFilterbranches(result)
  }

  const handleCheckboxChange = (specialityName) => {
    setSelectedFilters(prev =>
      prev.includes(specialityName)
        ? prev.filter(item => item !== specialityName)
        : [...prev, specialityName]
    )
  }

  useEffect(() => {
    if (branches) applyFilter()
  }, [branches, speciality, selectedFilters, searchQuery])

  const hasSuggestions = selectedFilters.some(f => serviceItemSuggestions[f])

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white'>

      {/* ── HERO HEADING ── */}
      <div className='px-6 md:px-16 pt-14 pb-0'>
        <div className='flex items-end justify-between mb-3'>
          <span className='uppercase tracking-[0.35em] text-[10px] font-bold text--400 font-sans'>
            Our Locations
          </span>
          <button
            onClick={() => setShowFilter(f => !f)}
            className='md:hidden uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans'
          >
            {showFilter ? 'Hide Filters' : 'Filter ↓'}
          </button>
        </div>
        <div className='h-px bg-blue-100 mb-10' />
        <h1
          className='leading-none text-blue-900 mb-16'
          style={{ fontSize: 'clamp(48px, 8vw, 110px)', fontWeight: 700, letterSpacing: '-0.03em' }}
        >
          Branches.
        </h1>
      </div>

      {/* ── BODY ── */}
      <div className='px-6 md:px-16 mb-28 flex flex-col md:flex-row gap-12 items-start'>

        {/* ── FILTER SIDEBAR ── */}
        <div className={`${showFilter ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-56 flex-shrink-0`}>

          {/* Search */}
          <span className='uppercase tracking-[0.35em] text-[10px] font-bold text-blue-400 font-sans block mb-3'>
            Search
          </span>
          <div className='h-px bg-blue-100 mb-4' />
          <div className='relative mb-8'>
            <input
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Branch name or service...'
              className='w-full px-4 py-2.5 pr-8 border border-blue-100 font-sans text-sm text-neutral-700 placeholder-neutral-300 focus:outline-none focus:border-blue-400 transition-colors bg-white'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-500 font-sans text-xs transition-colors'
              >
                ×
              </button>
            )}
          </div>

          {/* Filter by service */}
          <span className='uppercase tracking-[0.35em] text-[10px] font-bold text-blue-400 font-sans block mb-3'>
            Filter by Service
          </span>
          <div className='h-px bg-blue-100 mb-4' />

          <div className='flex flex-col border border-blue-100'>
            {allSpecialities.map((specialityName, index) => {
              const isChecked = selectedFilters.some(f => normalize(f) === normalize(specialityName))
              return (
                <label
                  key={index}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer border-b border-blue-50 last:border-b-0 transition-colors duration-150 font-sans text-sm ${
                    isChecked
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-neutral-600 hover:bg-blue-50'
                  }`}
                >
                  <input
                    type='checkbox'
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(specialityName)}
                    className='w-3.5 h-3.5 accent-blue-600 cursor-pointer flex-shrink-0'
                  />
                  {specialityName}
                </label>
              )
            })}
          </div>

          {selectedFilters.length > 0 && (
            <button
              onClick={() => { setSelectedFilters([]); navigate('/branches') }}
              className='mt-3 font-sans text-[10px] uppercase tracking-[0.35em] font-bold text-blue-400 hover:text-blue-600 text-left transition-colors'
            >
              Clear filters ×
            </button>
          )}

          {/* ── SUGGESTED ITEMS ── */}
          {hasSuggestions && (
            <div className='mt-8'>
              <span className='uppercase tracking-[0.35em] text-[10px] font-bold text-blue-400 font-sans block mb-3'>
                Suggested Clothes
              </span>
              <div className='h-px bg-blue-100 mb-4' />

              <div className='flex flex-col gap-3'>
                {selectedFilters
                  .filter(f => serviceItemSuggestions[f])
                  .flatMap((filter, fi) =>
                    serviceItemSuggestions[filter].map((group, gi) => (
                      <div key={`${fi}-${gi}`} className='border border-blue-100 p-3'>
                        <span className='font-sans text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-2'>
                          {group.label}
                        </span>
                        <ul className='flex flex-col gap-1.5'>
                          {group.items.map((item, ii) => (
                            <li key={ii} className='flex items-center gap-2 font-sans text-xs text-neutral-500'>
                              <span className='w-1 h-1 rounded-full bg-blue-300 flex-shrink-0' />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )
                }
              </div>
            </div>
          )}

        </div>

        {/* ── BRANCHES GRID ── */}
        <div className='flex-1 min-w-0'>

          <div className='flex items-center justify-between mb-8'>
            <span className='font-sans text-xs text-neutral-400'>
              Showing{' '}
              <span className='text-blue-600 font-bold'>{filterbranches.length}</span>{' '}
              {filterbranches.length === 1 ? 'branch' : 'branches'}
              {(selectedFilters.length > 0 || searchQuery) && (
                <span className='text-neutral-300'> — filtered</span>
              )}
            </span>
          </div>

          {filterbranches.length > 0 ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {filterbranches.map((item, index) => (
                <div
                  key={index}
                  onClick={() => { navigate(`/appointment/${item.id}`); scrollTo(0, 0) }}
                  className='group bg-white border border-blue-100 cursor-pointer flex flex-col overflow-hidden hover:bg-blue-600 transition-colors duration-300'
                >
                  {/* image */}
                  <div className='overflow-hidden'>
                    <img
                      src={item.image}
                      alt={item.name}
                      className='w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500'
                    />
                  </div>

                  {/* info */}
                  <div className='px-7 py-8 flex flex-col gap-4 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.available ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`font-sans text-[10px] uppercase tracking-[0.25em] transition-colors ${
                        item.available
                          ? 'text-green-500 group-hover:text-green-300'
                          : 'text-red-400 group-hover:text-red-300'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    <h3
                      className='leading-tight text-blue-900 group-hover:text-white transition-colors'
                      style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700, letterSpacing: '-0.02em' }}
                    >
                      {item.name}
                    </h3>

                    <p className='font-sans text-xs text-neutral-400 group-hover:text-white/60 transition-colors leading-relaxed line-clamp-2'>
  {item.about}
</p>

                    <div className='h-px bg-blue-100 group-hover:bg-white/10 transition-colors mt-2' />

                    <div className='flex items-center justify-between pt-1'>
                      <span className='font-sans text-xs text-blue-400 group-hover:text-white/50 transition-colors'>
                        Starting at
                      </span>
                      <span
                        className='text-blue-700 group-hover:text-white font-bold transition-colors'
                        style={{ fontSize: '16px', letterSpacing: '-0.02em' }}
                      >
                        ₱{item.fees}
                      </span>
                    </div>

                    <span className='font-sans text-xs text-vblue-300 font-bold group-hover:text-white/50 uppercase tracking-widest transition-colors'>
                      Book now →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='border border-blue-100 px-8 py-24 text-center'>
              <span className='uppercase tracking-[0.35em] text-[10px] text-blue-300 font-sans block mb-4'>
                No Results
              </span>
              <p className='text-blue-900 font-bold mb-8' style={{ fontSize: '24px', letterSpacing: '-0.02em' }}>
                No branches found.
              </p>
              <button
                onClick={() => { setSelectedFilters([]); setSearchQuery(''); navigate('/branches') }}
                className='group relative overflow-hidden bg-blue-600 text-white px-8 py-3 font-sans text-xs tracking-widest uppercase font-bold inline-flex items-center gap-3'
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
              >
                <span className='relative z-10'>View All Branches</span>
                <span className='relative z-10 group-hover:translate-x-1 transition-transform duration-300'>→</span>
                <div className='absolute inset-0 bg-blue-800 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out' />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default Branches