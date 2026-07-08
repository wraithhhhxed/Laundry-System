import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import AppContextProvider from './context/AppContext.jsx'
import AdminContextProvider from './context/AdminContext.jsx'
import BranchesContextProvider from './context/BranchesContext.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import axios from 'axios'                                        
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL      

createRoot(document.getElementById('root')).render(

  <GoogleOAuthProvider clientId="1095335813517-lj64cuoue8mnibog8gd67plqibu9vnat.apps.googleusercontent.com">
    <BrowserRouter>
      <AppContextProvider>
        <AdminContextProvider>
          <BranchesContextProvider>
            <App />
          </BranchesContextProvider>
        </AdminContextProvider>
      </AppContextProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
)