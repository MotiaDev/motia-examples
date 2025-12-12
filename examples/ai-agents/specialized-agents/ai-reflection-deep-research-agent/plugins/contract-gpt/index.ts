/**
 * ContractGPT Workbench Plugin
 * 
 * Provides a beautiful UI panel for uploading contracts
 * and viewing analysis results in real-time.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MotiaPlugin, MotiaPluginContext } from 'motia'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default function contractGptPlugin(motia: MotiaPluginContext): MotiaPlugin {
  // Register API endpoint to get contract details with analysis
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/contract-gpt/contracts',
    },
    async (_req, ctx) => {
      try {
        const contracts = await ctx.state.getGroup('contracts')
        
        // Get analysis results for completed contracts
        const contractsWithAnalysis = await Promise.all(
          contracts.map(async (contract: any) => {
            let analysis = null
            if (contract.refinedAnalysisId) {
              analysis = await ctx.state.get('refined-analyses', contract.refinedAnalysisId)
            }
            return {
              ...contract,
              analysis,
            }
          })
        )

        return {
          status: 200,
          body: { 
            contracts: contractsWithAnalysis.sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          },
        }
      } catch (error) {
        return {
          status: 500,
          body: { error: (error as Error).message },
        }
      }
    },
  )

  // Register API endpoint to get single contract with full details
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/contract-gpt/contracts/:id',
    },
    async (req, ctx) => {
      try {
        const { id } = req.pathParams
        const contract = await ctx.state.get('contracts', id)
        
        if (!contract) {
          return {
            status: 404,
            body: { error: 'Contract not found' },
          }
        }

        let analysis = null
        let draftAnalysis = null
        let critique = null

        if ((contract as any).refinedAnalysisId) {
          analysis = await ctx.state.get('refined-analyses', (contract as any).refinedAnalysisId)
        }
        if ((contract as any).draftAnalysisId) {
          draftAnalysis = await ctx.state.get('draft-analyses', (contract as any).draftAnalysisId)
        }
        if ((contract as any).critiqueId) {
          critique = await ctx.state.get('critiques', (contract as any).critiqueId)
        }

        return {
          status: 200,
          body: {
            contract,
            analysis,
            draftAnalysis,
            critique,
          },
        }
      } catch (error) {
        return {
          status: 500,
          body: { error: (error as Error).message },
        }
      }
    },
  )

  return {
    dirname: __dirname,
    workbench: [
      {
        componentName: 'ContractGptPanel',
        packageName: '~/plugins/contract-gpt/components/ContractGptPanel',
        label: 'ContractGPT',
        position: 'top',
        labelIcon: 'file-text',
      },
    ],
  }
}


