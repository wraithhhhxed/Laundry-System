import { Outlet } from 'react-router-dom'
import Navbar from './navbar'
import Footer from './Footer'

const UserLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

export default UserLayout