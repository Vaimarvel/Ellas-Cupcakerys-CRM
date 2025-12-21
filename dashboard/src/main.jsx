import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CustomerLanding from './customer/CustomerLanding.jsx'

const params = new URLSearchParams(window.location.search)
const isCustomer = params.get('view') === 'customer'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isCustomer ? <CustomerLanding /> : <App />}
  </StrictMode>,
)
