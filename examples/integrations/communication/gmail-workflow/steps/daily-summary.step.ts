import { CronConfig, StepHandler } from 'motia';
import { DiscordService } from "../services/discord.service";

export const config: CronConfig = {
  type: 'cron',
  name: 'Daily Email Summary',
  description: 'Generates and sends a daily summary of processed emails to Discord',
  cron: '* * 1 * *', // every day at 1am
  emits: ['gmail.summary.sent'],
  flows: ['gmail-flow']
};


export const handler: StepHandler<typeof config> = async ({emit, logger, state}) => {
  logger.info('Generating daily email summary');

  try {
    const discordService = new DiscordService(logger, state);
    const summary = await discordService.send();

    await state.set('email_analysis', 'auto_responded_emails', []);
    await state.set('email_analysis', 'processed_emails', []);

    await emit({
      topic: 'gmail.summary.sent',
      data: {
        date: (new Date()).toISOString().split('T')[0],
        summary,
        sentToDiscord: true
      }
    });

    logger.info('Daily summary completed', {summary});
  } catch (error) {
    logger.error(`Error generating daily summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 