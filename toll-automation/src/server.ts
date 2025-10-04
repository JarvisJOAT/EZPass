import express from 'express';
import path from 'path';
import config from './config';
import database from './storage/database';
import statementService from './services/statementService';
import { scheduleMonthlyJob } from './automation/scheduler';
import logger from './utils/logger';

const app = express();
app.use(express.json());

const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));
app.use('/downloads', express.static(config.downloadDir));

let isRunning = false;

app.get('/api/transactions', (_req, res) => {
  const transactions = database.getAllTransactions();
  res.json({ transactions });
});

app.get('/api/summary/plate', (_req, res) => {
  const summary = database.getSummaryByPlate();
  res.json({ summary });
});

app.get('/api/summary/transponder', (_req, res) => {
  const summary = database.getSummaryByTransponder();
  res.json({ summary });
});

app.post('/api/run', async (_req, res) => {
  if (isRunning) {
    return res.status(409).json({ message: 'A fetch is already in progress.' });
  }

  isRunning = true;
  logger.info('Manual statement fetch triggered');

  statementService
    .fetchLatestStatements()
    .then(() => {
      logger.info('Manual statement fetch completed');
    })
    .catch((error) => {
      logger.error('Manual statement fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      isRunning = false;
    });

  res.json({ message: 'Fetch started' });
});

app.get('/api/status', (_req, res) => {
  res.json({
    scheduleCron: config.scheduleCron,
    running: isRunning,
  });
});

app.use((_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const server = app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});

scheduleMonthlyJob();

process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Server shutdown gracefully');
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    logger.info('Server shutdown via SIGINT');
    process.exit(0);
  });
});
