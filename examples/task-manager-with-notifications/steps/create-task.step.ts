// steps/create-task.step.ts
export const config = {
  name: 'CreateTask',
  type: 'api',
  path: '/tasks',
  method: 'POST',
  emits: ['task.created']
};

export const handler = async (req: any, context: any) => {
  try {
    console.log('Request body:', req.body);
    console.log('Context:', Object.keys(context));

    const { title, description, email } = req.body;

    if (!title || !email) {
      return {
        status: 400,
        body: { error: 'Title and email are required' }
      };
    }

    const taskId = `task_${Date.now()}`;
    const task = {
      id: taskId,
      title,
      description: description || '',
      email,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    console.log('About to save task:', task);
    console.log('State available?', !!context.state);

    // Try saving WITHOUT state for now - just emit the event
    // if (context.state) {
    //   await context.state.set(`task:${taskId}`, JSON.stringify(task));
    // }

    // Emit event for background processing
    if (context.emit) {
      console.log('Emitting event...');
      await context.emit({
        topic: 'task.created',
        data: task
      });
    }

    if (context.logger) {
      context.logger.info('Task created', { taskId, title });
    }

    return {
      status: 201,
      body: {
        success: true,
        task
      }
    };
  } catch (error: any) {
    console.error('Error creating task:', error);
    console.error('Error stack:', error.stack);
    return {
      status: 500,
      body: { error: 'Failed to create task', details: error.message }
    };
  }
};