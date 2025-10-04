import { Page } from 'playwright';

export interface StatementMetadata {
  provider: ProviderId;
  statementDate: string; // yyyy-mm-dd
  periodStart?: string; // yyyy-mm-dd
  periodEnd?: string; // yyyy-mm-dd
  filePath: string;
  downloadedAt: string; // iso string
}

export interface TollTransaction {
  provider: ProviderId;
  statementDate: string;
  transactionDate: string;
  postedDate?: string;
  plate?: string;
  transponder?: string;
  location?: string;
  description?: string;
  amountCents: number;
}

export type ProviderId = 'driveEzMd' | 'ezPassNy';

export interface ProviderContext {
  downloadDir: string;
  processedDir: string;
}

export interface TollProvider {
  id: ProviderId;
  name: string;
  downloadLatestStatement(page: Page, ctx: ProviderContext): Promise<StatementMetadata | null>;
  parseStatement(metadata: StatementMetadata): Promise<TollTransaction[]>;
}
