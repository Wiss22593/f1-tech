import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { prepareDevelopmentSession } from './app/development-session.mjs'
import './styles/global.css'
import './styles/navigation.css'
import './styles/teams.css'
import './styles/garage.css'
import './styles/updates.css'
import './styles/product.css'

async function start() {
  if (import.meta.env.DEV) {
    try { if (!await prepareDevelopmentSession()) return }
    catch (error) { console.warn('[F1 Tech development session]', error) }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
void start()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js') })
}
