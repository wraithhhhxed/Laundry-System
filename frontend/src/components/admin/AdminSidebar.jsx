import { useContext } from 'react'
import { AdminContext } from '../../context/AdminContext'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  const { aToken } = useContext(AdminContext)

  const operationsItems = [
    { to: '/admin/dashboard',    label: 'Dashboard' },
    { to: '/admin/appointments', label: 'Appointments' },
    { to: '/admin/sales-report', label: 'Sales Report' },
  ]

  const catalogItems = [
    { to: '/admin/services',        label: 'Services' },
    { to: '/admin/extra-services',  label: 'Extra Services' },
    { to: '/admin/promo-codes',     label: 'Promo Codes' },
    { to: '/admin/products',        label: 'Products' },
  ]

  const peopleItems = [
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
      className='sticky top-0 h-screen overflow-y-auto bg-white border-r border-blue-100 flex flex-col flex-shrink-0 w-56'
      style={{ paddingTop: '70px' }}
    >
      <ul className='flex flex-col p-3 flex-1'>

        <SectionLabel label='Operations' />
        <div className='h-px bg-blue-100 mb-2' />
        {operationsItems.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label='Maintenance' />
        <div className='h-px bg-blue-100 mb-2' />
        {catalogItems.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label='Branches & Users' />
        <div className='h-px bg-blue-100 mb-2' />
        {peopleItems.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label='Settings' />
        <div className='h-px bg-blue-100 mb-2' />
        {settingsItems.map(item => <NavItem key={item.to} {...item} />)}

      </ul>
    </div>
  )
}

const SectionLabel = ({ label }) => (
  <li className='px-3 pt-4 pb-1'>
    <span className='uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold'>
      {label}
    </span>
  </li>
)

const NavItem = ({ to, label }) => (
  <li>
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 transition-colors font-sans text-sm
        ${isActive
          ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600 font-semibold'
          : 'text-neutral-400 hover:bg-blue-50 hover:text-blue-600'
        }`
      }
    >
      {({ isActive }) => (
        <span className={isActive ? 'text-blue-600' : ''}>{label}</span>
      )}
    </NavLink>
  </li>
)

export default Sidebar