import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

dotenv.config();

const cwd = process.cwd();

const resolvePath = (relativePath: string) =>
  path.isAbsolute(relativePath) ? relativePath : path.join(cwd, relativePath);

export interface AppConfig {
  port: number;
  dataDir: string;
  downloadDir: string;
  processedDir: string;
  databasePath: string;
  scheduleCron: string;
  driveEzMd: {
    username: string;
    password: string;
  };
  ezPassNy: {
    username: string;
    password: string;
  };
}

const ensureDir = (dirPath: string) => {
  fs.ensureDirSync(dirPath);
};

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const config: AppConfig = {
  port: Number(process.env.PORT ?? 3000),
  dataDir: resolvePath(process.env.DATA_DIR ?? './data'),
  downloadDir: resolvePath(process.env.DOWNLOAD_DIR ?? './data/raw'),
  processedDir: resolvePath(process.env.PROCESSED_DIR ?? './data/processed'),
  databasePath: resolvePath(process.env.DATABASE_PATH ?? './data/tolls.db'),
  scheduleCron: process.env.SCHEDULE_CRON ?? '0 6 1 * *',
  driveEzMd: {
    username: process.env.DRIVEEZMD_USERNAME ?? '',
    password: process.env.DRIVEEZMD_PASSWORD ?? '',
  },
  ezPassNy: {
    username: process.env.EZPASSNY_USERNAME ?? '',
    password: process.env.EZPASSNY_PASSWORD ?? '',
  },
};

ensureDir(config.dataDir);
ensureDir(config.downloadDir);
ensureDir(config.processedDir);

export const validateCredentials = () => {
  if (!config.driveEzMd.username || !config.driveEzMd.password) {
    throw new Error('DriveEzMD credentials are not configured. Please set DRIVEEZMD_USERNAME and DRIVEEZMD_PASSWORD.');
  }
  if (!config.ezPassNy.username || !config.ezPassNy.password) {
    throw new Error('E-ZPass NY credentials are not configured. Please set EZPASSNY_USERNAME and EZPASSNY_PASSWORD.');
  }
};

export default config;
