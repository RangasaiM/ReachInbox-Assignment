import { Client } from '@elastic/elasticsearch';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;

export const esClient = new Client({
  node: ELASTICSEARCH_HOST,
  auth: ELASTIC_API_KEY
    ? {
        apiKey: ELASTIC_API_KEY
      }
    : undefined
});

const INDEX_NAME = 'emails';

const INDEX_MAPPING = {
  properties: {
    subject: {
      type: 'text' as const
    },
    body: {
      type: 'text' as const
    },
    accountId: {
      type: 'keyword' as const
    },
    folder: {
      type: 'keyword' as const
    },
    aiCategory: {
      type: 'keyword' as const
    },
    date: {
      type: 'date' as const
    },
    indexedAt: {
      type: 'date' as const
    }
  }
};

export async function ensureIndex(): Promise<void> {
  try {
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });

    if (!indexExists) {
      logger.info({ index: INDEX_NAME }, 'Creating Elasticsearch index');
      console.log(`Creating Elasticsearch index: ${INDEX_NAME}`);

      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: INDEX_MAPPING
      });

      logger.info({ index: INDEX_NAME }, 'Elasticsearch index created successfully');
      console.log(`✅ Elasticsearch index created: ${INDEX_NAME}`);
    } else {
      logger.info({ index: INDEX_NAME }, 'Elasticsearch index already exists');
      console.log(`✅ Elasticsearch index exists: ${INDEX_NAME}`);
    }
  } catch (error) {
    logger.error({ error, index: INDEX_NAME }, 'Error ensuring Elasticsearch index');
    console.error('❌ Error ensuring Elasticsearch index:', error);
    throw error;
  }
}

export interface EmailDocument {
  subject: string;
  body: string;
  accountId: string;
  folder: string;
  aiCategory?: string;
  date: Date;
  indexedAt: Date;
}

export async function indexEmail(email: EmailDocument): Promise<void> {
  try {
    await esClient.index({
      index: INDEX_NAME,
      document: email
    });

    logger.info({ accountId: email.accountId, subject: email.subject }, 'Email indexed in Elasticsearch');
  } catch (error) {
    logger.error({ error, email }, 'Error indexing email in Elasticsearch');
    throw error;
  }
}
