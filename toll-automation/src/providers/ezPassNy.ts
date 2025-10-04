import path from 'path';
import fs from 'fs-extra';
import pdf from 'pdf-parse';
import { Page } from 'playwright';
import config from '../config';
import logger from '../utils/logger';
import {
  ProviderContext,
  StatementMetadata,
  TollProvider,
  TollTransaction,
} from './types';

const EZPASS_NY_LOGIN_URL = 'https://www.e-zpassny.com/ezpass/sign-in';
const EZPASS_NY_STATEMENTS_URL = 'https://www.e-zpassny.com/vector/secure/account/statement';

class EzPassNyProvider implements TollProvider {
  public readonly id = 'ezPassNy' as const;
  public readonly name = 'E-ZPass NY';

  private async login(page: Page) {
    logger.info('Logging into E-ZPass NY');
    await page.goto(EZPASS_NY_LOGIN_URL, { waitUntil: 'networkidle' });

    await page.fill('input[name="username"]', config.ezPassNy.username);
    await page.fill('input[name="password"]', config.ezPassNy.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]'),
    ]);
  }

  private async navigateToStatements(page: Page) {
    logger.info('Navigating to E-ZPass NY statements area');
    await page.goto(EZPASS_NY_STATEMENTS_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Statement History');
  }

  public async downloadLatestStatement(page: Page, ctx: ProviderContext): Promise<StatementMetadata | null> {
    await this.login(page);
    await this.navigateToStatements(page);

    const statementRow = await page.$('table tbody tr:first-child');

    if (!statementRow) {
      logger.warn('No statements found for E-ZPass NY');
      return null;
    }

    const dateCellText = (await statementRow.$eval('td:nth-child(1)', (el) => el.textContent))?.trim();

    if (!dateCellText) {
      logger.warn('Unable to determine statement date on E-ZPass NY');
      return null;
    }

    const isoStatementDate = this.normalizeDate(dateCellText);
    const downloadedAt = new Date().toISOString();
    const safeFileName = `ezpassny-${isoStatementDate}.pdf`;
    const destinationPath = path.join(ctx.downloadDir, safeFileName);

    await fs.ensureDir(ctx.downloadDir);

    const downloadTrigger =
      (await statementRow.$('a:has-text("Download")')) ||
      (await statementRow.$('a:has-text("PDF")')) ||
      (await statementRow.$('button:has-text("Download")')) ||
      statementRow;

    const downloadPromise = page.waitForEvent('download');
    await downloadTrigger.click();
    const download = await downloadPromise;
    await download.saveAs(destinationPath);

    logger.info('Downloaded E-ZPass NY statement', { destinationPath });

    return {
      provider: this.id,
      statementDate: isoStatementDate,
      filePath: destinationPath,
      downloadedAt,
    };
  }

  public async parseStatement(metadata: StatementMetadata): Promise<TollTransaction[]> {
    logger.info('Parsing E-ZPass NY statement', { filePath: metadata.filePath });

    const buffer = await fs.readFile(metadata.filePath);
    const pdfData = await pdf(buffer);
    const lines: string[] = pdfData.text
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    const transactions: TollTransaction[] = [];

    for (const line of lines) {
      const parsed = this.parseTransactionLine(line);
      if (!parsed) {
        continue;
      }

      transactions.push({
        provider: this.id,
        statementDate: metadata.statementDate,
        ...parsed,
      });
    }

    logger.info('Parsed E-ZPass NY statement', { count: transactions.length });

    return transactions;
  }

  private parseTransactionLine(line: string) {
    const transactionRegex = /(?<transactionDate>\d{2}\/\d{2}\/\d{4})\s+(?<postedDate>\d{2}\/\d{2}\/\d{4})?\s+(?<plate>[A-Z0-9-]*)\s+(?<transponder>[A-Z0-9-]*)\s+(?<description>[A-Za-z0-9\s\-]+?)\s+(?<amount>-?\$?\d+,?\d*\.\d{2})$/;
    const match = transactionRegex.exec(line);

    if (!match || !match.groups) {
      return null;
    }

    const amountCents = this.parseAmount(match.groups.amount);

    return {
      transactionDate: this.normalizeDate(match.groups.transactionDate),
      postedDate: match.groups.postedDate ? this.normalizeDate(match.groups.postedDate) : undefined,
      plate: match.groups.plate || undefined,
      transponder: match.groups.transponder || undefined,
      description: match.groups.description?.trim(),
      amountCents,
      location: undefined,
    };
  }

  private parseAmount(value: string): number {
    const normalized = value.replace(/[^0-9.-]+/g, '');
    const amount = Number(normalized);
    return Math.round(amount * 100);
  }

  private normalizeDate(input: string): string {
    if (!input) {
      return new Date().toISOString().slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }

    const [month, day, year] = input.split(/[\/-]/).map((v) => v.padStart(2, '0'));
    return `${year}-${month}-${day}`;
  }
}

const ezPassNyProvider = new EzPassNyProvider();

export default ezPassNyProvider;
