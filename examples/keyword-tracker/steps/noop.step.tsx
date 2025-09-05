import { BaseNode, Button, NoopNodeProps } from 'motia/workbench'
import React from 'react'

export default function FlowStarter({ data }: NoopNodeProps) {
  const start = () => {
    fetch('/kickstart', { method: 'POST' })
  }

  return (
    <BaseNode title="Start" variant="noop" disableTargetHandle>
      <h1>Noop Start Starter</h1>
      <p>Kickstart the flow</p>
      <p>Click the button below to start the flow by sending a POST request</p>
      <Button onClick={start}>Start Flow</Button>
    </BaseNode>
  )
} 