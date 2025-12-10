import { env } from './env'

export const appConfig = {
  trello: {
    apiKey: env.TRELLO_API_KEY,
    token: env.TRELLO_TOKEN,
    lists: {
      newTasks: env.TRELLO_NEW_TASKS_LIST_ID,
      inProgress: env.TRELLO_IN_PROGRESS_LIST_ID,
      needsReview: env.TRELLO_NEEDS_REVIEW_LIST_ID,
      completed: env.TRELLO_COMPLETED_LIST_ID,
    },
    customFields: {
      developmentStatus: env.TRELLO_CUSTOM_FIELD_DEV_STATUS!,
      doneValue: env.TRELLO_CUSTOM_FIELD_DONE_VALUE!,
    },
  },
  slack: {
    webhookUrl: env.SLACK_WEBHOOK_URL,
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
  },
}
