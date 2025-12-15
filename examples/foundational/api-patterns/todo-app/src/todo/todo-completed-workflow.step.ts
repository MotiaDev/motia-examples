import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Todo Completed Workflow Event Step
 *
 * Background job that handles the completion workflow:
 * - Sends completion notification
 * - Awards points/achievements
 * - Updates streaks
 * - Triggers any follow-up actions
 */

const inputSchema = z.object({
  todoId: z.string(),
  title: z.string(),
  completedAt: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'TodoCompletedWorkflow',
  description: 'Handles the todo completion workflow with rewards and notifications',
  subscribes: ['todo-completed'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [
    { topic: 'achievement-unlocked', label: 'Achievement Unlocked', conditional: true },
    { topic: 'notification-sent', label: 'Completion Notification Sent' },
  ],
}

export const handler: Handlers['TodoCompletedWorkflow'] = async (input, { emit, logger, state }) => {
  const { todoId, title, completedAt } = input

  logger.info('Processing todo completion workflow', { todoId, title, completedAt })

  // Get user completion stats from state
  const userId = 'demo-user' // In production, this would come from the context
  const statsKey = `${userId}-completion-stats`

  const existingStats = await state.get<{
    totalCompleted: number
    streakDays: number
    lastCompletionDate: string
  }>('user-stats', statsKey)

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  let totalCompleted = (existingStats?.totalCompleted ?? 0) + 1
  let streakDays = existingStats?.streakDays ?? 0

  // Check if this continues a streak (completed something yesterday)
  if (existingStats?.lastCompletionDate) {
    const lastDate = new Date(existingStats.lastCompletionDate)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      streakDays++
      logger.info('Streak continued!', { streakDays })
    } else if (lastDate.toISOString().split('T')[0] !== todayStr) {
      // Reset streak if not today or yesterday
      streakDays = 1
      logger.info('Streak reset', { streakDays })
    }
  } else {
    streakDays = 1
  }

  // Update stats in state
  await state.set('user-stats', statsKey, {
    totalCompleted,
    streakDays,
    lastCompletionDate: todayStr,
  })

  logger.info('User stats updated', { totalCompleted, streakDays })

  // Check for achievement milestones
  const achievements: string[] = []

  if (totalCompleted === 1) {
    achievements.push('first-todo')
    logger.info('Achievement unlocked: First Todo!')
  }

  if (totalCompleted === 10) {
    achievements.push('productive-10')
    logger.info('Achievement unlocked: 10 Todos Completed!')
  }

  if (totalCompleted === 100) {
    achievements.push('centurion')
    logger.info('Achievement unlocked: Centurion (100 Todos)!')
  }

  if (streakDays === 7) {
    achievements.push('week-warrior')
    logger.info('Achievement unlocked: Week Warrior (7 Day Streak)!')
  }

  // Emit achievement events
  for (const achievement of achievements) {
    await emit({
      topic: 'achievement-unlocked',
      data: {
        userId,
        achievement,
        todoId,
        unlockedAt: new Date().toISOString(),
      },
    })
  }

  // Send completion notification
  await emit({
    topic: 'notification-sent',
    data: {
      todoId,
      channels: ['in-app'],
      sentAt: new Date().toISOString(),
      message: `Great job completing "${title}"! ${achievements.length > 0 ? `You unlocked ${achievements.length} achievement(s)!` : ''}`,
    },
  })

  logger.info('Todo completion workflow finished', {
    todoId,
    totalCompleted,
    streakDays,
    achievementsUnlocked: achievements.length,
  })
}

