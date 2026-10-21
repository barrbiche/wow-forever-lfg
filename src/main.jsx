import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polices.css'
import './textures.css'
import './index.css'
import './babillard.css'
import App from './App.jsx'
import Confidentialite from './Confidentialite.jsx'

// Page publique de la politique de confidentialité (adresse fixe, sans connexion).
const page = window.location.pathname.replace(/\/+$/, '').toLowerCase()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {page === '/confidentialite' ? <Confidentialite /> : <App />}
  </StrictMode>,
)
