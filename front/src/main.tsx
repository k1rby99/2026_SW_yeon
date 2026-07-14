import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function prepare() {
  // 기본값은 실제 백엔드. MSW 목업은 VITE_API_MOCKING=true 로 명시할 때만 켠다.
  const shouldMock = import.meta.env.DEV && import.meta.env.VITE_API_MOCKING === 'true'

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
