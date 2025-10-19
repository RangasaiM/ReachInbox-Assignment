import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import pino from 'pino';
import { startImapSync } from './imap/imapClient';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'ReachInbox Onebox API' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running`);
  
  try {
    await startImapSync();
  } catch (error) {
    logger.error({ error }, 'Failed to start IMAP sync');
    console.error('Failed to start IMAP sync:', error);
  }
});
