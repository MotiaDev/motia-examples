export const config = {
  name: 'SendNotification',
  type: 'event',
  subscribes: ['task.completed'],
  emits: []
};

export const handler = async (input: any, { logger }: any) => {
  // FIX: Input is the task directly
  const task = input;

  if (!task || !task.email) {
    logger.error('Invalid notification payload', { received: input });
    return;
  }

  logger.info('📧 Email notification sent', {
    to: task.email,
    subject: `Task Completed: ${task.title}`
  });

  console.log(`
  ========================================
  📧 EMAIL SENT TO ${task.email}
  ========================================
  `);
};
