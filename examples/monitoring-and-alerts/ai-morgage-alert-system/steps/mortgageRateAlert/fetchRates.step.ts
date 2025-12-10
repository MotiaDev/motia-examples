import { CronConfig, Handlers } from 'motia';
import { scrapeMortgageRates } from '../../src/services/scraper';

export const config: CronConfig = {
  name: 'FetchMortgageRates',
  type: 'cron',
  description: 'Fetches current mortgage rates every 6 hours and checks for significant changes',
  cron: '0 */6 * * *', // Every 6 hours
  emits: ['rate-changes-detected'],
  flows: ['mortgage-rate-alert']
};

export const handler: Handlers['FetchMortgageRates'] = async ({ logger, emit, state }) => {
  logger.info('Starting mortgage rate fetch');
  
  const currentRates = await scrapeMortgageRates();
  
  logger.info('Rates fetched successfully', { 
    rateCount: currentRates.rates.length,
    source: currentRates.source 
  });
  
  // Get previous rates from state
  const previousRates = await state.get<typeof currentRates.rates>('mortgage-rates', 'latest');
  
  if (previousRates && previousRates.length > 0) {
    // Import detectRateChanges
    const { detectRateChanges } = await import('../../src/services/scraper');
    
    const changes = detectRateChanges(currentRates.rates, previousRates, 0.125);
    
    if (changes.length > 0) {
      logger.info('Significant rate changes detected', { changeCount: changes.length });
      
      await emit({
        topic: 'rate-changes-detected',
        data: {
          changes,
          timestamp: currentRates.scrapedAt
        }
      });
    } else {
      logger.info('No significant rate changes detected');
    }
  } else {
    logger.info('No previous rates to compare - this is the first run');
  }
  
  // Store current rates for next comparison
  await state.set('mortgage-rates', 'latest', currentRates.rates);
  await state.set('mortgage-rates', `history-${Date.now()}`, currentRates);
  
  logger.info('Mortgage rates stored successfully');
};

