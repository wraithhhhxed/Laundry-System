import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../context/AdminContext'

const BranchesList = () => {
  const { branches, aToken, getAllBranches, changeAvailability } = useContext(AdminContext)

  useEffect(() => {
    if (aToken) getAllBranches()
  }, [aToken])

  return (
    <div className='px-4 sm:px-6 py-8'>
      <p className='text-2xl font-semibold text-gray-800 mb-6'>All Branches</p>

      <div className='bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden'>

        <div className='hidden sm:grid grid-cols-[60px_2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200'>
          <p className='text-xs font-medium text-gray-500 uppercase'>#</p>
          <p className='text-xs font-medium text-gray-500 uppercase'>Branch</p>
          <p className='text-xs font-medium text-gray-500 uppercase'>Speciality</p>
          <p className='text-xs font-medium text-gray-500 uppercase'>Experience</p>
          <p className='text-xs font-medium text-gray-500 uppercase'>Fees</p>
          <p className='text-xs font-medium text-gray-500 uppercase'>Available</p>
        </div>

        {branches.length > 0 ? branches.map((branch, index) => (
          <div
            key={branch._id}
            className='grid grid-cols-[60px_2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors duration-150'
          >
            <p className='text-sm text-gray-500'>{index + 1}</p>

            <div className='flex items-center gap-3'>
              <img
                src={branch.image}
                alt={branch.name}
                className='w-9 h-9 rounded object-cover border border-gray-200'
              />
              <div>
                <p className='text-sm font-medium text-gray-800'>{branch.name}</p>
                <p className='text-xs text-gray-400'>{branch.phone}</p>
              </div>
            </div>

            <p className='text-sm text-gray-600'>{branch.speciality}</p>
            <p className='text-sm text-gray-600'>{branch.experience}</p>
            <p className='text-sm text-gray-600'>₱{branch.fees}</p>

            <div>
              <span
                onClick={() => changeAvailability(branch._id)}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-all duration-200 ${
                  branch.available
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                }`}>
                {branch.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
        )) : (
          <div className='px-6 py-12 text-center'>
            <p className='text-gray-400 text-sm'>No branches found</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default BranchesList