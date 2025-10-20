import express, { Request, Response } from 'express';
import { esClient } from '../elastic/elasticClient';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

const router = express.Router();

// Get all accounts
router.get('/accounts', async (_req: Request, res: Response) => {
  try {
    // Get unique account IDs from Elasticsearch
    const response = await esClient.search({
      index: 'emails',
      body: {
        size: 0,
        aggs: {
          accounts: {
            terms: {
              field: 'accountId',
              size: 100
            }
          }
        }
      }
    });

    const accounts = (response.aggregations?.accounts as any)?.buckets?.map((bucket: any) => bucket.key) || [];
    
    res.json({ accounts });
  } catch (error) {
    logger.error({ error }, 'Error fetching accounts');
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get emails with pagination
router.get('/emails', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const from = (page - 1) * pageSize;

    const response = await esClient.search({
      index: 'emails',
      body: {
        from,
        size: pageSize,
        sort: [
          { date: { order: 'desc' } }
        ]
      }
    });

    const emails = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source
    }));

    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
    const totalPages = Math.ceil(total / pageSize);

    res.json({
      emails,
      total,
      page,
      pageSize,
      totalPages
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching emails');
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Search emails
router.get('/emails/search', async (req: Request, res: Response) => {
  try {
    const { q: query, account, folder, page = 1, pageSize = 20 } = req.query;
    const from = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    let searchBody: any = {
      from,
      size: parseInt(pageSize as string),
      sort: [
        { date: { order: 'desc' } }
      ]
    };

    // Build query based on filters
    const mustQueries: any[] = [];

    if (query) {
      mustQueries.push({
        multi_match: {
          query: query as string,
          fields: ['subject^2', 'body'],
          type: 'best_fields'
        }
      });
    }

    if (account) {
      mustQueries.push({
        term: { accountId: account }
      });
    }

    if (folder) {
      mustQueries.push({
        term: { folder: folder }
      });
    }

    if (mustQueries.length > 0) {
      searchBody.query = {
        bool: {
          must: mustQueries
        }
      };
    } else {
      searchBody.query = { match_all: {} };
    }

    const response = await esClient.search({
      index: 'emails',
      body: searchBody
    });

    const emails = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source
    }));

    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
    const totalPages = Math.ceil(total / parseInt(pageSize as string));

    res.json({
      emails,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      totalPages
    });
  } catch (error) {
    logger.error({ error }, 'Error searching emails');
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

// Get email by ID
router.get('/emails/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await esClient.get({
      index: 'emails',
      id
    });

    res.json({
      id: response._id,
      ...(response._source as any)
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Error fetching email');
    res.status(404).json({ error: 'Email not found' });
  }
});

// Get email statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const response = await esClient.search({
      index: 'emails',
      body: {
        size: 0,
        aggs: {
          total_emails: {
            value_count: {
              field: '_id'
            }
          },
          by_category: {
            terms: {
              field: 'aiCategory',
              size: 10
            }
          },
          by_account: {
            terms: {
              field: 'accountId',
              size: 10
            }
          },
          by_folder: {
            terms: {
              field: 'folder',
              size: 10
            }
          }
        }
      }
    });

    const stats = {
      totalEmails: (response.aggregations?.total_emails as any)?.value || 0,
      byCategory: (response.aggregations?.by_category as any)?.buckets || [],
      byAccount: (response.aggregations?.by_account as any)?.buckets || [],
      byFolder: (response.aggregations?.by_folder as any)?.buckets || []
    };

    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Error fetching stats');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
