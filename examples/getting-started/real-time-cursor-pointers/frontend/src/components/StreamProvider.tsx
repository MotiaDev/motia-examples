'use client'

import { MotiaStreamProvider } from '@motiadev/stream-client-react'
import { ReactNode } from 'react'

const WS_ADDRESS = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'

export function StreamProvider({ children }: { children: ReactNode }) {
  return (
    <MotiaStreamProvider address={WS_ADDRESS}>
      {children}
    </MotiaStreamProvider>
  )
}
