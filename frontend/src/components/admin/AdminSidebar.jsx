import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  const { aToken } = useContext(AdminContext)

  const operationsItems = [
    { to: '/admin/dashboard',    label: 'Dashboard' },
    { to: '/admin/appointments', label: 'Appointments' },
    { to: '/admin/walk-in',      label: 'Walk In' },
    { to: '/admin/sales-report', label: 'Sales Report' },
  ]

  const maintenanceItems = [
    { to: '/admin/services',        label: 'Services' },
    { to: '/admin/extra-services',  label: 'Extra Services' },
    { to: '/admin/promo-codes',     label: 'Promo Codes' },
    { to: '/admin/products',        label: 'Products' },
  ]

  const branchesUsersItems = [
    { to: '/admin/branch-maintenance', label: 'Branch Maintenance' },
    { to: '/admin/users',              label: 'User Management' },
  ]

  const settingsItems = [
    { to: '/admin/vat-settings', label: 'VAT Settings' },
    { to: '/admin/faqs',         label: 'FAQ Settings' },
    { to: '/admin/audit-logs',   label: 'Audit Log' },
  ]

  if (!aToken) return null

  return (
    <div
      className='sticky top-0 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 w-64'
      style={{ paddingTop: '70px' }}
    >
      {/* Scrollable content with visible scrollbar */}
      <div className='flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400'>
        <ul className='space-y-1'>

          {/* OPERATIONS Section */}
          <li className='px-3 pt-2 pb-1'>
            <span className='uppercase tracking-[0.3em] text-[11px] text-gray-400 font-semibold'>
              Operations
            </span>
          </li>
          <div className='h-px bg-gray-200 mb-2' />
          {operationsItems.map(item => <NavItem key={item.to} {...item} />)}

          {/* MAINTENANCE Section */}
          <li className='px-3 pt-4 pb-1'>
            <span className='uppercase tracking-[0.3em] text-[11px] text-gray-400 font-semibold'>
              Maintenance
            </span>
          </li>
          <div className='h-px bg-gray-200 mb-2' />
          {maintenanceItems.map(item => <NavItem key={item.to} {...item} />)}

          {/* BRANCHES & USERS Section */}
          <li className='px-3 pt-4 pb-1'>
            <span className='uppercase tracking-[0.3em] text-[11px] text-gray-400 font-semibold'>
              Branches & Users
            </span>
          </li>
          <div className='h-px bg-gray-200 mb-2' />
          {branchesUsersItems.map(item => <NavItem key={item.to} {...item} />)}

          {/* SETTINGS Section */}
          <li className='px-3 pt-4 pb-1'>
            <span className='uppercase tracking-[0.3em] text-[11px] text-gray-400 font-semibold'>
              Settings
            </span>
          </li>
          <div className='h-px bg-gray-200 mb-2' />
          {settingsItems.map(item => <NavItem key={item.to} {...item} />)}

        </ul>
      </div>
    </div>
  )
}

const NavItem = ({ to, label }) => (
  <li>
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2.5 rounded-lg text-sm font-medium
        ${isActive
          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 pl-5'
          : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
        }`
      }
    >
      {label}
    </NavLink>
  </li>
)

export default Sidebar