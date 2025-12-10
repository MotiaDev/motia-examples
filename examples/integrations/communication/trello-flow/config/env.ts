import { cleanEnv, str } from 'envalid'

export const env = cleanEnv(process.env, {
  TRELLO_API_KEY: str({ devDefault: 'trello-api-key' }),
  TRELLO_TOKEN: str({ devDefault: 'trello-token' }),

  OPENAI_API_KEY: str({ devDefault: 'openai-api-key' }),
  OPENAI_MODEL: str({ devDefault: 'gpt-3.5-turbo' }),

  SLACK_WEBHOOK_URL: str({ devDefault: 'slack-webhook-url' }),

  TRELLO_NEW_TASKS_LIST_ID: str({ devDefault: 'new-tasks-list-id' }),
  TRELLO_IN_PROGRESS_LIST_ID: str({ devDefault: 'in-progress-list-id' }),
  TRELLO_NEEDS_REVIEW_LIST_ID: str({ devDefault: 'needs-review-list-id' }),
  TRELLO_COMPLETED_LIST_ID: str({ devDefault: 'completed-list-id' }),

  TRELLO_CUSTOM_FIELD_DEV_STATUS: str({ devDefault: 'custom-field-dev-status-id' }),
  TRELLO_CUSTOM_FIELD_DONE_VALUE: str({ devDefault: 'custom-field-done-value-id' }),
})
