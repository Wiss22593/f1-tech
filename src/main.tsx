import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/global.css'
import './styles/navigation.css'
import './styles/teams.css'
import './styles/garage.css'
import './styles/updates.css'
import './styles/product.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
