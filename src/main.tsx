import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Development only: `?lab` shows the renderer reference sheet.
const RenderLab = import.meta.env.DEV && new URLSearchParams(location.search).has('lab')
  ? lazy(() => import('./dev/RenderLab').then((module) => ({ default: module.RenderLab })))
  : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {RenderLab ? <Suspense><RenderLab /></Suspense> : <App />}
  </StrictMode>,
)
