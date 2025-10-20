import { QdrantClient } from '@qdrant/js-client-rest';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = 'product_knowledge';
const VECTOR_SIZE = 768; // Gemini embedding size

let qdrantClient: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    const config: any = {
      url: QDRANT_URL,
    };

    if (QDRANT_API_KEY) {
      config.apiKey = QDRANT_API_KEY;
    }

    qdrantClient = new QdrantClient(config);
    logger.info({ url: QDRANT_URL }, 'Qdrant client initialized');
  }

  return qdrantClient;
}

export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();

  try {
    const collections = await client.getCollections();
    const collectionExists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      logger.info({ collection: COLLECTION_NAME }, 'Creating Qdrant collection');
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      logger.info({ collection: COLLECTION_NAME }, 'Qdrant collection created');
    } else {
      logger.info({ collection: COLLECTION_NAME }, 'Qdrant collection already exists');
    }
  } catch (error) {
    logger.error({ error, collection: COLLECTION_NAME }, 'Error ensuring Qdrant collection');
    throw error;
  }
}

export { COLLECTION_NAME, VECTOR_SIZE };
export { QdrantClient } from '@qdrant/js-client-rest';
