import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

/**
 * Achievement Handler Event Step
 *
 * Processes achievement unlocks.
 * Demonstrates multi-step workflow with gamification.
 * Could integrate with:
 * - Badge systems
 * - Leaderboards
 * - Social sharing
 */

const inputSchema = z.object({
  userId: z.string(),
  achievement: z.string(),
  todoId: z.string(),
  unlockedAt: z.string(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'AchievementHandler',
  description: 'Processes achievement unlocks and stores badges',
  subscribes: ['achievement-unlocked'],
  flows: ['todo-app'],
  input: inputSchema,
  emits: [],
}

// Achievement definitions
const ACHIEVEMENTS: Record<string, { name: string; description: string; points: number }> = {
  'first-todo': {
    name: 'First Steps',
    description: 'Completed your first todo',
    points: 10,
  },
  'productive-10': {
    name: 'Getting Things Done',
    description: 'Completed 10 todos',
    points: 50,
  },
  centurion: {
    name: 'Centurion',
    description: 'Completed 100 todos',
    points: 200,
  },
  'week-warrior': {
    name: 'Week Warrior',
    description: 'Maintained a 7-day completion streak',
    points: 100,
  },
}

export const handler: Handlers['AchievementHandler'] = async (input, { logger, state }) => {
  const { userId, achievement, todoId, unlockedAt } = input

  logger.info('Processing achievement unlock', { userId, achievement, todoId })

  const achievementInfo = ACHIEVEMENTS[achievement]

  if (!achievementInfo) {
    logger.warn('Unknown achievement type', { achievement })
    return
  }

  // Store the unlocked achievement
  const achievementRecord = {
    id: achievement,
    name: achievementInfo.name,
    description: achievementInfo.description,
    points: achievementInfo.points,
    unlockedAt,
    triggerTodoId: todoId,
  }

  await state.set('user-achievements', `${userId}-${achievement}`, achievementRecord)

  // Update user's total points
  const pointsKey = `${userId}-points`
  const existingPoints = await state.get<{ total: number }>('user-points', pointsKey)

  const newTotal = (existingPoints?.total ?? 0) + achievementInfo.points

  await state.set('user-points', pointsKey, {
    total: newTotal,
    lastUpdated: new Date().toISOString(),
  })

  logger.info('Achievement processed', {
    userId,
    achievement: achievementInfo.name,
    pointsAwarded: achievementInfo.points,
    totalPoints: newTotal,
  })
}

