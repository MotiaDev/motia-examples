import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'

const inputSchema = z.object({
  timestamp: z.string(),
  traceId: z.string(),
  testName: z.string(),
  operation: z.enum(['create', 'read', 'update', 'delete', 'batch']),
  customPayload: z.record(z.string(), z.any()).optional(),
})

export const config: EventConfig = {
  type: 'event',
  name: 'StateQueueTest',
  description: 'State management queue test - validates state operations within queue handlers',
  flows: ['queue-tests'],
  subscribes: ['queue-test.state'],
  emits: [],
  input: inputSchema,
}

export const handler: Handlers['StateQueueTest'] = async (input, { traceId, logger, state }) => {
  const startTime = Date.now()
  const testGroupId = 'queue-state-test'
  
  logger.info('📦 State queue test started', {
    testName: input.testName,
    traceId,
    operation: input.operation,
  })

  const results: Record<string, any> = {
    operation: input.operation,
    success: true,
    details: {},
  }

  try {
    // Test CREATE operation
    const testData = {
      id: `test-item-${traceId}`,
      createdAt: new Date().toISOString(),
      data: {
        foo: 'bar',
        count: 42,
        nested: { value: 'test' },
      },
    }

    logger.info('📝 Creating test state item', { traceId, itemId: testData.id })
    await state.set(testGroupId, testData.id, testData)
    results.details.created = testData.id

    // Test READ operation
    logger.info('📖 Reading test state item', { traceId, itemId: testData.id })
    const retrieved = await state.get(testGroupId, testData.id)
    results.details.retrieved = retrieved !== null
    
    if (!retrieved) {
      throw new Error('Failed to retrieve created state item')
    }

    // Test UPDATE operation
    logger.info('✏️ Updating test state item', { traceId, itemId: testData.id })
    const updatedData = {
      ...testData,
      updatedAt: new Date().toISOString(),
      data: { ...testData.data, count: 100, updated: true },
    }
    await state.set(testGroupId, testData.id, updatedData)
    results.details.updated = true

    // Verify update
    const afterUpdate = await state.get<typeof updatedData>(testGroupId, testData.id)
    results.details.updateVerified = afterUpdate?.data?.count === 100

    // Test getGroup operation
    logger.info('📚 Getting all items in group', { traceId, groupId: testGroupId })
    const allItems = await state.getGroup(testGroupId)
    results.details.groupItemCount = allItems.length

    // Test batch operations
    logger.info('📦 Testing batch state operations', { traceId })
    const batchItems = [
      { id: `batch-1-${traceId}`, value: 'item1' },
      { id: `batch-2-${traceId}`, value: 'item2' },
      { id: `batch-3-${traceId}`, value: 'item3' },
    ]

    for (const item of batchItems) {
      await state.set(testGroupId, item.id, item)
    }
    results.details.batchCreated = batchItems.length

    // Test DELETE operation
    logger.info('🗑️ Deleting test state items', { traceId })
    await state.delete(testGroupId, testData.id)
    results.details.deleted = true

    // Verify deletion
    const afterDelete = await state.get(testGroupId, testData.id)
    results.details.deleteVerified = afterDelete === null

    // Clean up batch items
    for (const item of batchItems) {
      await state.delete(testGroupId, item.id)
    }
    results.details.batchDeleted = batchItems.length

  } catch (error: any) {
    logger.error('❌ State queue test failed', { traceId, error: error.message })
    results.success = false
    results.error = error.message
  }

  const processingTime = Date.now() - startTime

  logger.info('✅ State queue test completed', {
    testName: input.testName,
    traceId,
    processingTimeMs: processingTime,
    results,
  })

  // Store test result
  await state.set('queue-test-results', `state-${traceId}`, {
    testType: 'state',
    traceId,
    processingTimeMs: processingTime,
    results,
    status: results.success ? 'completed' : 'failed',
    completedAt: new Date().toISOString(),
  })
}

