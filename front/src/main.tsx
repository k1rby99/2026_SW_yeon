import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function prepare() {
  const shouldMock = import.meta.env.DEV && import.meta.env.VITE_API_MOCKING !== 'false'

  if (shouldMock) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
}

const root = createRoot(document.getElementById('root')!)

prepare().finally(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
