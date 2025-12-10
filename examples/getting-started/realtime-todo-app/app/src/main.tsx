import { MotiaStreamProvider } from '@motiadev/stream-client-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { STREAM_URL } from './constants.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotiaStreamProvider address={STREAM_URL}>
      <App />
    </MotiaStreamProvider>
  </StrictMode>,
)
