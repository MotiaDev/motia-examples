export const config = {
  name: 'GetTask',
  type: 'api',
  path: '/tasks/:id',
  method: 'GET',
  emits: []
};

export const handler = async (req: any, { state, logger }: any) => {
  const taskId = req.params.id;
  let task = await state.get(`task:${taskId}`);

  if (!task) {
    return {
      status: 404,
      body: { error: 'Task not found' }
    };
  }

  // FIX: Parse if it returned a string (due to manual stringify)
  if (typeof task === 'string') {
    try {
      task = JSON.parse(task);
    } catch (e) {
      logger.warn('Failed to parse task JSON', { taskId });
    }
  }

  logger.info('Task retrieved', { taskId });

  return {
    status: 200,
    body: { task }
  };
};
