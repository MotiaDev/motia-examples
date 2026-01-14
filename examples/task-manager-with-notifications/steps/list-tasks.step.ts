export const config = {
  name: 'ListTasks',
  type: 'api',
  path: '/tasks',
  method: 'GET',
  emits: []
};

export const handler = async (req: any, { state, logger }: any) => {
  const keys = await state.list('task:');
  
  const tasks = await Promise.all(
    keys.map(async (key: string) => {
      const data = await state.get(key);
      // FIX: Parse if string
      if (typeof data === 'string') {
        try { return JSON.parse(data); } catch(e) { return null; }
      }
      return data;
    })
  );

  const validTasks = tasks.filter(Boolean);
  logger.info('Tasks listed', { count: validTasks.length });

  return {
    status: 200,
    body: {
      tasks: validTasks,
      count: validTasks.length
    }
  };
};
