import appointment_img from './appointment_img.png'
import header_img from './header_img.png'
import group_profiles from './group_profiles.png'
import profile_pic from './profile_pic.png'
import contact_image from './contact_image.png'
import about_image from './about_image.png'
import logo from './logo.png'
import dropdown_icon from './dropdown_icon.svg'
import menu_icon from './menu_icon.svg'
import cross_icon from './cross_icon.png'
import chats_icon from './chats_icon.svg'
import verified_icon from './verified_icon.svg'
import arrow_icon from './arrow_icon.svg'
import info_icon from './info_icon.svg'
import upload_icon from './upload_icon.png'
import stripe_logo from './stripe_logo.png'
import razorpay_logo from './razorpay_logo.png'

// Laundry Branch Images
import branch1 from './branch1.png'
import branch2 from './branch2.png'
import branch3 from './branch3.png'
import branch4 from './branch4.png'
import branch5 from './branch5.png'
import branch6 from './branch6.png'

// Laundry Service Icons/Images
import WashOnly from './WashOnly.svg'
import WashDry from './WashDry.svg'
import DryClean from './DryClean.svg'
import FoldOnly from './FoldOnly.svg'
import IronPress from './IronPress.svg'
import FullService from './FullService.svg'


export const assets = {
    appointment_img,
    header_img,
    group_profiles,
    logo,
    chats_icon,
    verified_icon,
    info_icon,
    profile_pic,
    arrow_icon,
    contact_image,
    about_image,
    menu_icon,
    cross_icon,
    dropdown_icon,
    upload_icon,
    stripe_logo,
    razorpay_logo
}

export const specialityData = [
  {
    speciality: 'Wash&Dry',
    image: WashDry
  },
  {
    speciality: 'Dry Clean',
    image: DryClean
  },
  {
    speciality: 'Fold Only',
    image: FoldOnly
  },
  {
    speciality: 'Iron Press',
    image: IronPress
  },
  {
    speciality: 'Full Service',
    image: FullService
  },
]

export const branches = [
  {
    _id: 'branch1',
    name: 'Selfie Wash BGC',
    image: branch1,
    speciality: ['Wash Only', 'Full Service', 'Wash&Dry'],
    experience: 'Established 2019',
    about: 'Selfie Wash BGC offers full-service washing, drying, folding, and ironing with fast turnaround and affordable pricing.',
    fees: 150,
    address: {
      line1: 'Bonifacio Global City',
      line2: 'Taguig City, Metro Manila'
    }
  },
  {
    _id: 'branch2',
    name: 'Selfie Wash Fort Bonifacio',
    image: branch2,
    speciality: ['Dry Clean', 'Full Service', 'Iron Press'],
    experience: 'Established 2021',
    about: 'Selfie Wash Fort Bonifacio specializes in dry cleaning and delicate fabric care using modern machines.',
    fees: 160,
    address: {
      line1: 'Fort Bonifacio',
      line2: 'Taguig City, Metro Manila'
    }
  },
  {
    _id: 'branch3',
    name: 'Selfie Wash McKinley',
    image: branch3,
    speciality: ['Full Service', 'Wash Only', 'Iron Press', 'Fold Only'],
    experience: 'Established 2023',
    about: 'Selfie Wash McKinley focuses on premium laundry services, perfect for formal and branded clothing.',
    fees: 140,
    address: {
      line1: 'McKinley Hill',
      line2: 'Taguig City, Metro Manila'
    }
  },
  {
    _id: 'branch4',
    name: 'Selfie Wash Market Market',
    image: branch4,
    speciality: ['Wash&Dry', 'Full Service', 'Wash Only'],
    experience: 'Established 2020',
    about: 'Selfie Wash Market Market provides affordable wash services ideal for students and daily laundry needs.',
    fees: 130,
    address: {
      line1: 'Market Market Mall',
      line2: 'Taguig City, Metro Manila'
    }
  },
  {
    _id: 'branch5',
    name: 'Selfie Wash Venice',
    image: branch5,
    speciality: ['Full Service', 'Iron Press', 'Fold Only', 'Dry Clean'],
    experience: 'Established 2018',
    about: 'Selfie Wash Venice is known for professional ironing and pressing services, ensuring wrinkle-free clothes.',
    fees: 120,
    address: {
      line1: 'Venice Grand Canal',
      line2: 'Taguig City, Metro Manila'
    }
  },
  {
    _id: 'branch6',
    name: 'Selfie Wash Upper East',
    image: branch6,
    speciality: ['Iron Press', 'Full Service', 'Wash Only', 'Dry Clean', 'Fold Only'],
    experience: 'Established 2022',
    about: 'Selfie Wash Upper East offers quick and neat folding services for freshly washed clothes.',
    fees: 145,
    address: {
      line1: 'Upper East Side',
      line2: 'Taguig City, Metro Manila'
    }
  }
]