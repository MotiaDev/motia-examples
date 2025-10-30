import React from 'react'
import { BaseNode, NoopNodeProps } from 'motia/workbench'

export const Node: React.FC<NoopNodeProps> = ({ data }) => {
  const virtualEmits = (data as any).virtualEmits || []
  const virtualSubscribes = (data as any).virtualSubscribes || []
  
  return (
    <BaseNode
      title={data.name}
      variant="noop"
      data={data}
      subtitle={data.description}
      disableTargetHandle={!virtualSubscribes.length}
      disableSourceHandle={!virtualEmits.length}
    />
  )
}

