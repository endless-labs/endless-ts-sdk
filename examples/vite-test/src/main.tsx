import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import RoutesComponent from './routes'
import './assets/scss/global.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RoutesComponent />
    </BrowserRouter>
  </StrictMode>,
)
