import path from 'path';
import fs from 'fs-extra';
import { chromium } from 'playwright';
import config, { validateCredentials } from '../config';
import providers from '../providers';
import { ProviderContext, TollProvider } from '../providers/types';
import database from '../storage/database';
import logger from '../utils/logger';

export class StatementService {
  private providerContext: ProviderContext = {
    downloadDir: config.downloadDir,
    processedDir: config.processedDir,
  };

  public async fetchLatestStatements() {
    validateCredentials();

    for (const provider of providers) {
      try {
        await this.fetchForProvider(provider);
      } catch (error) {
        logger.error(`Failed to process provider ${provider.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  public async fetchForProvider(provider: TollProvider) {
    logger.info(`Starting fetch for ${provider.name}`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      const metadata = await provider.downloadLatestStatement(page, this.providerContext);

      if (!metadata) {
        logger.warn(`No new statements available for ${provider.name}`);
        return;
      }

      const storedStatement = database.upsertStatement(metadata);

      const transactions = await provider.parseStatement(metadata);

      if (transactions.length === 0) {
        logger.warn(`No transactions parsed for ${provider.name}`);
        return;
      }

      database.replaceTransactions(storedStatement.id, transactions);

      const processedPath = path.join(config.processedDir, provider.id, `${metadata.statementDate}.json`);
      await fs.ensureDir(path.dirname(processedPath));
      await fs.writeJson(processedPath, { statement: metadata, transactions }, { spaces: 2 });
      logger.info(`Stored ${transactions.length} transactions for ${provider.name}`);
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }
}

const statementService = new StatementService();

export default statementService;
