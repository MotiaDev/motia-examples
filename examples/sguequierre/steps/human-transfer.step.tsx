// human-transfer.step.tsx
import React from 'react'
import { BaseHandle, Position } from 'motia/workbench'
import '@xyflow/react/dist/style.css'
 
export default function HumanTransferFileWithDocs() {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 text-white">
      <h3 className="text-lg font-semibold mb-3">Documentation Transfer Guide</h3>
      
      <div className="mb-4 text-sm">
        If you approved the documentation, it has been generated and saved to the output directory.
        Please follow these steps to complete the process:
      </div>
      
      <div className="bg-gray-700 p-3 rounded mb-4">
        <ol className="list-decimal pl-5 text-sm space-y-2">
          <li>Open your file explorer/finder</li>
          <li>Navigate to <span className="font-mono bg-gray-900 px-1 rounded">output/</span> in your Motia project folder</li>
          <li>Copy the documented file to your source code directory</li>
          <li>Review the changes before committing them</li>
        </ol>
      </div>
      
      <div className="bg-yellow-900 bg-opacity-50 p-3 rounded border border-yellow-700 mb-4">
        <div className="flex items-start">
          <span className="text-yellow-300 mr-2">⚠️</span>
          <p className="text-sm text-yellow-100">
            Remember to test your code after adding the documentation to ensure everything still works correctly.
          </p>
        </div>
      </div>
      
      <div className="bg-blue-900 bg-opacity-50 p-3 rounded border border-blue-700">
        <div className="flex items-start">
          <span className="text-blue-300 mr-2">💡</span>
          <p className="text-sm text-blue-100">
            Tip: You can use your IDE's diff tool to review the changes before finalizing them.
          </p>
        </div>
      </div>
      
      {/* Required handle for Motia's flow */}
      <BaseHandle type="source" position={Position.Bottom} />
    </div>
  )
}