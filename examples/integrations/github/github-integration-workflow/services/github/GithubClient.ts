import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'
import { CheckRun, RawCheckRun } from '../../types/github'

export class GithubClient {
  private client: Octokit

  constructor() {
    this.client = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
  }

  async getIssue(owner: string, repo: string, issueNumber: number) {
    const { data } = await this.client.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })
    return data
  }

  async createComment(owner: string, repo: string, issueNumber: number, body: string) {
    const { data } = await this.client.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })
    return data
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    update: Partial<RestEndpointMethodTypes['issues']['update']['parameters']>
  ) {
    const { data } = await this.client.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...update,
    })
    return data
  }

  async addLabels(owner: string, repo: string, issueNumber: number, labels: string[]) {
    const { data } = await this.client.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels,
    })
    return data
  }

  async requestReviews(
    owner: string,
    repo: string,
    pullNumber: number,
    reviewers: string[]
  ): Promise<void> {
    await this.client.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number: pullNumber,
      reviewers,
    })
  }

  async getCheckRuns(owner: string, repo: string, ref: string): Promise<CheckRun[]> {
    const { data } = await this.client.rest.checks.listForRef({
      owner,
      repo,
      ref,
      per_page: 100,
    })

    return data.check_runs.map((run: RawCheckRun) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion || 'neutral',
      started_at: run.started_at || '',
      completed_at: run.completed_at || '',
    }))
  }
}
