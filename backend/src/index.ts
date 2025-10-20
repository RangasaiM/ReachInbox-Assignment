import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import pino from 'pino';
import cors from 'cors';
import { startImapSync } from './imap/imapClient';
import { ensureIndex, searchEmails, getUniqueAccounts } from './elastic/elasticClient';
import { ensureCollection } from './vector/qdrantClient';
import { seedDefaultProductData } from './utils/seedProductData';
import ragRoutes from './routes/ragRoutes';

dotenv.config({ path: path.join(__dirname, '../.env') });

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', ragRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'ReachInbox Onebox API' });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await getUniqueAccounts();
    res.json({ accounts });
  } catch (error) {
    logger.error({ error }, 'Error fetching accounts - returning empty list');
    res.json({ accounts: [] });
  }
});

app.get('/api/emails', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const from = (page - 1) * pageSize;

    const result = await searchEmails({ from, size: pageSize });
    res.json({
      emails: result.emails,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching emails - returning empty list');
    res.json({
      emails: [],
      total: 0,
      page: 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      totalPages: 0
    });
  }
});

app.get('/api/emails/search', async (req: Request, res: Response) => {
  try {
    const { q, account, folder, category, page = '1', pageSize = '20' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const size = parseInt(pageSize as string) || 20;
    const from = (pageNum - 1) * size;

    const result = await searchEmails({
      query: q as string,
      accountId: account as string,
      folder: folder as string,
      aiCategory: category as string,
      from,
      size
    });

    res.json({
      emails: result.emails,
      total: result.total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(result.total / size)
    });
  } catch (error) {
    logger.error({ error }, 'Error searching emails - returning empty list');
    const { page = '1', pageSize = '20' } = req.query;
    res.json({
      emails: [],
      total: 0,
      page: parseInt(page as string) || 1,
      pageSize: parseInt(pageSize as string) || 20,
      totalPages: 0
    });
  }
});

app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running`);
  
  try {
    await ensureIndex();
  } catch (error) {
    logger.error({ error }, 'Failed to ensure Elasticsearch index');
    console.error('Failed to ensure Elasticsearch index:', error);
  }
  
  if (process.env.QDRANT_URL && process.env.GEMINI_API_KEY) {
    try {
      logger.info('Initializing Qdrant vector database...');
      await ensureCollection();
      
      if (process.env.SEED_PRODUCT_DATA === 'true') {
        logger.info('Seeding default product data...');
        await seedDefaultProductData();
      }
      
      logger.info('Qdrant vector database ready');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Qdrant - RAG features will be unavailable');
      console.error('Failed to initialize Qdrant:', error);
    }
  } else {
    logger.warn('QDRANT_URL or GEMINI_API_KEY not set - RAG features will be unavailable');
  }
  
  try {
    await startImapSync();
  } catch (error) {
    logger.error({ error }, 'Failed to start IMAP sync');
    console.error('Failed to start IMAP sync:', error);
  }
});
