import React from 'react'
import Header from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import FeaturedBranches from '../components/FeaturedBranches'
import Banner from '../components/Banner'
import HomeFaqs from '../components/HomeFaqs'

const Home = () => {
  return (
    <div>
      <Header />
      <SpecialityMenu />
      <FeaturedBranches />
      <Banner />
      <HomeFaqs />
    </div>
  )
}

export default Home