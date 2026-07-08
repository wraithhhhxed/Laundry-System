import { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AdminContext } from './context/AdminContext'
import { BranchesContext } from './context/BranchesContext'

// Admin
import AdminNavbar from './components/admin/AdminNavbar'
import AdminSidebar from './components/admin/AdminSidebar'
import AdminDashboard from './pages/admin/Dashboard'
import AllAppointments from './pages/admin/AllAppointments'
import AddBranch from './pages/admin/AddBranch'
import ServicesList from './pages/admin/ServicesList'
import ClothingTypesList from './pages/admin/ClothingTypesList'
import KgRatesList from './pages/admin/KgRatesList'
import AuditLogs from './pages/admin/AuditLogs'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import UserMaintenance from './pages/admin/UserMaintenance'
import BranchMaintenance from './pages/admin/BranchMaintenance'
import PromoCodesList from './pages/admin/PromoCodesList'
import VatSettings from './pages/admin/VatSettings'
import RefundReasonsSettings from './pages/admin/RefundReasonsSettings'
import FaqSettings from './pages/admin/FaqSettings'
import PriceSettings from './pages/admin/PriceSettings'
import ProductManagement from './pages/admin/ProductManagement'
import SalesReport from './pages/admin/SalesReport'
import ExtraServiceList from './pages/admin/ExtraServiceList' // ✅ added

// Branch
import BranchNavbar from './components/branch/BranchNavbar'
import BranchSidebar from './components/branch/BranchSidebar'
import BranchDashboard from './pages/branch/BranchDashboard'
import BranchAppointments from './pages/branch/BranchAppointments'
import BranchProfile from './pages/branch/BranchProfile'
import BranchInventory from './pages/branch/BranchInventory'
import BranchSalesReport from './pages/branch/BranchSalesReport'

// User
import Navbar from './components/navbar'
import Footer from './components/Footer'
import Home from './pages/home'
import Branches from './pages/branches'
import About from './pages/About'
import Contact from './pages/contact'
import Login from './pages/login'
import MyProfile from './pages/myprofiles'
import MyAppointments from './pages/myappointments'
import Appointment from './pages/appointment'
import PaymentSuccess from './pages/PaymentSuccess'
import SecretLogin from './pages/SecretLogin'
import AdminLogin from './pages/AdminLogin'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'

const App = () => {
  const { aToken } = useContext(AdminContext)
  const { bToken } = useContext(BranchesContext)

  if (aToken) {
    return (
      <div className='bg-gray-50'>
        <ToastContainer />
        <AdminNavbar />
        <div className='flex items-start'>
          <AdminSidebar />
          <main className='flex-1'>
            <Routes>
              <Route path='/admin/dashboard'          element={<AdminDashboard />} />
              <Route path='/admin/appointments'       element={<AllAppointments />} />
              <Route path='/admin/add-branch'         element={<AddBranch />} />
              <Route path='/admin/branch-maintenance' element={<BranchMaintenance />} />
              <Route path='/admin/services'           element={<ServicesList />} />
              <Route path='/admin/clothing-types'     element={<ClothingTypesList />} />
              <Route path='/admin/kg-rates'           element={<KgRatesList />} />
              <Route path='/admin/extra-services'     element={<ExtraServiceList />} /> {/* ✅ added */}
              <Route path='/admin/promo-codes'        element={<PromoCodesList />} />
              <Route path='/admin/products'           element={<ProductManagement />} />
              <Route path='/admin/users'              element={<UserMaintenance />} />
              <Route path='/admin/audit-logs'         element={<AdminAuditLog />} />
              <Route path='/admin/login-history'      element={<AuditLogs />} />
              <Route path='/admin/vat-settings'       element={<VatSettings />} />
              <Route path='/admin/refund-reasons'     element={<RefundReasonsSettings />} />
              <Route path='/admin/faqs'               element={<FaqSettings />} />
              <Route path='/admin/prices'             element={<PriceSettings />} />
              <Route path='/admin/sales-report'       element={<SalesReport />} />
              <Route path='*'                         element={<Navigate to='/admin/dashboard' replace />} />
            </Routes>
          </main>
        </div>
      </div>
    )
  }

  if (bToken) {
    return (
      <div className='bg-gray-50'>
        <ToastContainer />
        <BranchNavbar />
        <div className='flex items-start'>
          <BranchSidebar />
          <main className='flex-1'>
            <Routes>
              <Route path='/branch/dashboard'    element={<BranchDashboard />} />
              <Route path='/branch/appointments' element={<BranchAppointments />} />
              <Route path='/branch/inventory'    element={<BranchInventory />} />
              <Route path='/branch/profile'      element={<BranchProfile />} />
              <Route path='/branch/sales-report' element={<BranchSalesReport />} />
              <Route path='*'                    element={<Navigate to='/branch/dashboard' replace />} />
            </Routes>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-4 sm:mx-[10%]'>
      <ToastContainer />
      <Navbar />
      <Routes>
        <Route path='/'                       element={<Home />} />
        <Route path='/branches'               element={<Branches />} />
        <Route path='/branches/:speciality'   element={<Branches />} />
        <Route path='/login'                  element={<Login />} />
        <Route path='/about'                  element={<About />} />
        <Route path='/contact'                element={<Contact />} />
        <Route path='/my-profile'             element={<MyProfile />} />
        <Route path='/my-appointments'        element={<MyAppointments />} />
        <Route path='/appointment/:branchid'  element={<Appointment />} />
        <Route path='/payment-success'        element={<PaymentSuccess />} />
        <Route path='/payment-failed'         element={<PaymentSuccess />} />
        <Route path='/secret-login'           element={<SecretLogin />} />
        <Route path='/admin-login'            element={<AdminLogin />} />
        <Route path='*'                       element={<Navigate to='/' replace />} />
        <Route path='/forgot-password'        element={<ForgotPassword />} />
        <Route path='/reset-password/:token'  element={<ResetPassword />} />
      </Routes>
      <Footer />
    </div>
  )
}

export default App