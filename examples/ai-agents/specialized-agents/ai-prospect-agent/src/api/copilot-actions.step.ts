/**
 * CopilotKit Actions API Step
 * Handles CopilotKit action execution for the in-app copilot
 */
import { ApiRouteConfig, Handlers } from 'motia'
import { z } from 'zod'
import { ApiMiddleware } from 'motia'
import { ZodError } from 'zod'

const coreMiddleware: ApiMiddleware = async (req, ctx, next) => {
  try {
    return await next()
  } catch (error: any) {
    if (error instanceof ZodError) {
      return { status: 400, body: { error: 'Validation failed' } }
    }
    ctx.logger.error('Request failed', { error: error.message })
    return { status: 500, body: { error: 'Internal Server Error' } }
  }
}

const bodySchema = z.object({
  action: z.enum(['view_prospect', 'draft_emails', 'create_call_list', 'send_email', 'refresh_research']),
  data: z.record(z.string(), z.any()),
})

export const config: ApiRouteConfig = {
  name: 'CopilotActions',
  type: 'api',
  path: '/api/copilot/actions',
  method: 'POST',
  description: 'Execute CopilotKit actions from the in-app copilot',
  emits: ['prospect.research.queued'],
  flows: ['copilot'],
  middleware: [coreMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({ success: z.boolean(), result: z.any(), message: z.string() }),
    400: z.object({ error: z.string() }),
  },
}

export const handler: Handlers['CopilotActions'] = async (req, { emit, logger, state }) => {
  const { action, data } = bodySchema.parse(req.body)

  logger.info('Executing copilot action', { action, data })

  switch (action) {
    case 'view_prospect': {
      const prospectId = data.prospectId as string
      if (!prospectId) return { status: 400, body: { error: 'Missing prospectId' } }

      const research = await state.get<any>('research_results', prospectId)
      if (!research) return { status: 400, body: { error: 'Prospect not found' } }

      return {
        status: 200,
        body: { success: true, result: { prospect: research.prospect, research }, message: `Loaded ${research.prospect?.company_name || 'prospect'}` },
      }
    }

    case 'draft_emails': {
      const prospectIds = data.prospectIds as string[]
      if (!prospectIds?.length) return { status: 400, body: { error: 'Missing prospectIds' } }

      const emails: any[] = []
      for (const id of prospectIds) {
        const research = await state.get<any>('research_results', id)
        if (research?.email_draft) {
          emails.push({
            prospect_id: id,
            company: research.prospect?.company_name || 'Unknown',
            subject: research.email_subject,
            body: research.email_draft,
            talking_points: research.talking_points,
          })
        }
      }

      return { status: 200, body: { success: true, result: { emails }, message: `Retrieved ${emails.length} email drafts` } }
    }

    case 'create_call_list': {
      const prospectIds = data.prospectIds as string[]
      if (!prospectIds?.length) return { status: 400, body: { error: 'Missing prospectIds' } }

      const callList: any[] = []
      for (const id of prospectIds) {
        const research = await state.get<any>('research_results', id)
        if (research?.prospect) {
          callList.push({
            prospect_id: id,
            company: research.prospect.company_name,
            contact: `${research.prospect.first_name} ${research.prospect.last_name}`,
            title: research.prospect.title,
            fit_score: research.fit_score,
            talking_points: research.talking_points?.slice(0, 3) || [],
          })
        }
      }

      callList.sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))

      return { status: 200, body: { success: true, result: { call_list: callList }, message: `Created call list with ${callList.length} prospects` } }
    }

    case 'refresh_research': {
      const prospectId = data.prospectId as string
      if (!prospectId) return { status: 400, body: { error: 'Missing prospectId' } }

      const research = await state.get<any>('research_results', prospectId)
      if (!research?.prospect) return { status: 400, body: { error: 'Prospect not found' } }

      await emit({
        topic: 'prospect.research.queued',
        data: { batch_id: research.prospect.batch_id || 'manual-refresh', prospect_index: 0, prospect: { ...research.prospect, id: prospectId } },
      })

      return { status: 200, body: { success: true, result: { queued: true }, message: `Research refresh queued for ${research.prospect.company_name}` } }
    }

    default:
      return { status: 400, body: { error: `Unknown action: ${action}` } }
  }
}
