import cron from 'node-cron';
import config from '../config';
import statementService from '../services/statementService';
import logger from '../utils/logger';

export const scheduleMonthlyJob = () => {
  if (!cron.validate(config.scheduleCron)) {
    throw new Error(`Invalid cron expression: ${config.scheduleCron}`);
  }

  logger.info(`Scheduling monthly statement check with cron: ${config.scheduleCron}`);

  cron.schedule(config.scheduleCron, async () => {
    logger.info('Running scheduled toll statement check');
    await statementService.fetchLatestStatements();
  });
};
