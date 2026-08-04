import { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { BranchesContext } from '../../context/BranchesContext'

const BranchSidebar = () => {
  const { bToken } = useContext(BranchesContext)

  if (!bToken) return null

  const operationsItems = [
    { to: '/branch/dashboard',    label: 'Dashboard' },
    { to: '/branch/appointments', label: 'Appointments' },
    { to: '/branch/walk-in',      label: 'Walk-In' },
    { to: '/branch/inventory',    label: 'Inventory' },
    { to: '/branch/sales-report', label: 'Sales Report' },
  ]

  const accountItems = [
    { to: '/branch/profile', label: 'Profile' },
  ]

  return (
    <div
      className="sticky top-0 h-screen overflow-y-auto bg-white border-r border-blue-100 flex flex-col flex-shrink-0 w-56 sidebar-scroll"
      style={{ paddingTop: '70px' }}
    >
      <ul className="flex flex-col p-3 flex-1">

        <SectionLabel label="Operations" />
        <div className="h-px bg-blue-100 mb-2" />
        {operationsItems.map(item => <NavItem key={item.to} {...item} />)}

        <SectionLabel label="Account" />
        <div className="h-px bg-blue-100 mb-2" />
        {accountItems.map(item => <NavItem key={item.to} {...item} />)}

      </ul>
    </div>
  )
}

const SectionLabel = ({ label }) => (
  <li className="px-3 pt-4 pb-1">
    <span className="uppercase tracking-[0.35em] text-[10px] text-blue-400 font-sans font-semibold">
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

export default BranchSidebar