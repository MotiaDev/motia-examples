export const config = {
  name: 'ProcessTask',
  type: 'event',
  subscribes: ['task.created'],
  emits: ['task.completed']
};

export const handler = async (input: any, { emit, state, logger }: any) => {
  // 1. Unpack input
  const task = input;
  
  if (!task || !task.id) {
    logger.error('Invalid task payload', { received: input });
    return;
  }

  logger.info('Processing task', { taskId: task.id });

  // 2. Simulate processing
  await new Promise(resolve => setTimeout(resolve, 500));

  const updatedTask = {
    ...task,
    status: 'completed',
    completedAt: new Date().toISOString()
  };

  // 3. Try to save state (but do not crash if it fails)
  try {
    // Attempt to save as string
    await state.set(`task:${task.id}`, JSON.stringify(updatedTask));
  } catch (err: any) {
    logger.warn('Database save failed (skipping)', { error: err.message });
    // We continue anyway so the email still gets sent!
  }

  // 4. Emit the event for the email handler
  try {
    await emit({
      topic: 'task.completed',
      data: updatedTask
    });
    logger.info('Task completed event emitted', { taskId: task.id });
  } catch (err: any) {
    logger.error('Emit failed', { error: err.message });
    throw err;
  }
};
