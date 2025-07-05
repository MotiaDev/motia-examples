import { BaseNode, Button, NoopNodeProps } from 'motia/workbench'
import React from 'react'

export default function FlowStarter({ data }: NoopNodeProps) {
  const start = () => {
    fetch('/default', { method: 'POST' })
  }

  return (
    <BaseNode title="Start" variant="noop" disableTargetHandle>
      <Button onClick={start}>Start Flow</Button>
    </BaseNode>
  )
} 