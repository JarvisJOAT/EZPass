# Toll Automation Agent

Automation agent and local dashboard for downloading monthly toll statements from DriveEzMD and E-ZPass NY, parsing transactions by license plate / transponder, and presenting summaries in a simple UI.

## Features
- Playwright-driven agent logs into both portals, downloads the newest statement, and stores transactions in SQLite.
- Automatic cron schedule (default: first day of the month at 06:00) plus manual trigger from the UI.
- Local dashboard summarises totals per plate and transponder and lists all parsed transactions with links back to the statement PDFs.
- Parsed data is also exported to JSON (`data/processed/<provider>/<date>.json`) for downstream workflows.

## Prerequisites
- Node.js 18+
- npm (ships with Node)
- Credentials for both DriveEzMD and E-ZPass NY accounts.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   Available configuration keys:
   | Key | Description |
   | --- | --- |
   | `PORT` | HTTP port for the dashboard (default `3000`). |
   | `DATA_DIR` | Root data directory (default `./data`). |
   | `DOWNLOAD_DIR` | Where raw statements are saved (default `./data/raw`). |
   | `PROCESSED_DIR` | Location for parsed JSON exports (default `./data/processed`). |
   | `DATABASE_PATH` | SQLite database path (default `./data/tolls.db`). |
   | `SCHEDULE_CRON` | Cron expression for the automatic fetch (default `0 6 1 * *`). |
   | `DRIVEEZMD_USERNAME` / `DRIVEEZMD_PASSWORD` | Login credentials for DriveEzMD. |
   | `EZPASSNY_USERNAME` / `EZPASSNY_PASSWORD` | Login credentials for E-ZPass NY. |
3. Build the TypeScript sources (optional for dev, required for production):
   ```bash
   npm run build
   ```

## Running
- Development mode (auto-reloads on change):
  ```bash
  npm run dev
  ```
- Production mode (after `npm run build`):
  ```bash
  npm start
  ```

The dashboard will be available at `http://localhost:<PORT>`.

## Manual fetch & scheduling
- The Playwright agent runs automatically using the cron expression configured in `SCHEDULE_CRON`.
- Use the **Fetch Latest Statements** button in the UI (or send `POST /api/run`) to start a manual run.

## Data locations
- Raw statements: `DOWNLOAD_DIR` (served under `/downloads` for quick access via the UI).
- Parsed statements: `PROCESSED_DIR/<provider>/<YYYY-MM-DD>.json`.
- Database: `DATABASE_PATH` (SQLite).

## Adjusting portal automation
The DriveEzMD and E-ZPass NY portals change periodically. If logins or downloads fail:
1. Update selectors and navigation in:
   - `src/providers/driveEzMd.ts`
   - `src/providers/ezPassNy.ts`
2. Adjust the regex rules inside each provider’s `parseTransactionLine` function to match the latest PDF layout. Parsed transactions must include:
   - `transactionDate`
   - `amountCents` (integer, cents)
   - Optional `plate`, `transponder`, `description`, `postedDate`, `location`

Run `npm run build` to confirm TypeScript stays happy after adjustments.

## Notes & Limitations
- Portal MFA or CAPTCHA challenges will block fully automated runs. If these are enabled, consider switching accounts to alternate authentication or using Playwright’s browser UI mode and manually clearing the challenge once per login.
- PDF parsing uses heuristics; you may need to tweak the regex to match the exact layout of your statements.
- Statements are downloaded once per run. Existing transactions for the same statement date are replaced, so re-running a fetch is idempotent.

## Next steps
- Add provider-specific unit tests using mock PDFs to guard parsing logic.
- Encrypt credentials or integrate with a secrets manager (e.g., 1Password CLI, AWS Secrets Manager).
- Emit structured logs or webhook notifications when new statements are ingested.
