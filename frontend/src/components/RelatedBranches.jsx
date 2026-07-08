import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const RelatedBranches = ({ speciality, branchid }) => {
  const { branches } = useContext(AppContext)
  const navigate     = useNavigate()

  const [relBranches, setRelBranches] = useState([])

  useEffect(() => {
    if (branches.length > 0 && speciality) {
      const branchesData = branches
        .filter(branch => branch._id !== branchid && branch.speciality.includes(speciality))
        .slice(0, 5)
      setRelBranches(branchesData)
    }
  }, [branches, speciality, branchid])

  if (relBranches.length === 0) return null

  return (
    <div style={{ fontFamily: "'Georgia', serif" }} className='bg-white px-6 md:px-16 py-16'>

      {/* header */}
      <div className='flex items-end justify-between mb-3'>
        <span className='uppercase tracking-[0.35em] text-[10px] font-bold text-violet-400 font-sans'>
          You Might Also Like
        </span>
      </div>
      <div className='h-px bg-violet-100 mb-10' />

      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10'>
        <h2
          className='leading-none text-violet-900'
          style={{ fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 700, letterSpacing: '-0.03em' }}
        >
          Related Branches.
        </h2>
        <p className='font-sans text-sm text-neutral-400 max-w-xs md:text-right leading-relaxed'>
          Other branches offering similar laundry services near you.
        </p>
      </div>

      {/* grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
        {relBranches.map((item, index) => (
          <div
            key={index}
            onClick={() => { navigate(`/appointment/${item._id}`); scrollTo(0, 0) }}
            className='group bg-white border border-violet-100 cursor-pointer flex flex-col overflow-hidden hover:bg-violet-600 hover:border-violet-600 transition-colors duration-300'
          >
            {/* image */}
            <div className='overflow-hidden'>
              <img
                src={item.image}
                alt={item.name}
                className='w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500'
              />
            </div>

            {/* info */}
            <div className='px-7 py-7 flex flex-col gap-3'>
              <div className='flex items-center gap-2'>
                <span className='w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0' />
                <span className='font-sans text-[10px] uppercase tracking-[0.25em] text-green-500 group-hover:text-green-300 transition-colors'>
                  Available
                </span>
              </div>

              <h3
                className='leading-tight text-violet-900 group-hover:text-white transition-colors'
                style={{ fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {item.name}
              </h3>

              <p className='font-sans text-xs text-neutral-400 group-hover:text-white/60 transition-colors leading-relaxed'>
                {Array.isArray(item.speciality) ? item.speciality.join(' • ') : item.speciality}
              </p>

              <div className='h-px bg-violet-100 group-hover:bg-white/10 transition-colors mt-1' />

              <span className='font-sans text-xs text-violet-300 group-hover:text-white/50 uppercase tracking-widest transition-colors'>
                Book now →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RelatedBranches