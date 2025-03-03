export type GithubPREventTypes = {
  // Webhook events
  '/api/github/pr-webhook': 'PR webhook received'

  // PR lifecycle events
  'github.pr.opened': 'New PR created'
  'github.pr.edited': 'PR updated'
  'github.pr.closed': 'PR closed'
  'github.pr.merged': 'PR merged'

  // Processing events
  'github.pr.processed': 'Initial PR processing complete'
  'github.pr.classified': 'PR classified by LLM'
  'github.pr.labeled': 'PR labels applied'
  'github.pr.reviewers-assigned': 'PR reviewers assigned'
  'github.pr.tests-completed': 'PR tests finished'
  'github.pr.approved': 'PR approved'
  'github.pr.ready-to-merge': 'PR ready for merging'
  'github.pr.post-merge': 'Post-merge actions triggered'
}
