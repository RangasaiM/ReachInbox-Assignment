import { getQdrantClient, COLLECTION_NAME } from './qdrantClient';
import { generateEmbedding } from '../ai/embeddingService';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface ProductData {
  id: string;
  text: string;
  category: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  text: string;
  category: string;
  score: number;
  metadata?: Record<string, any>;
}

export async function storeProductData(data: ProductData): Promise<void> {
  try {
    const client = getQdrantClient();
    const embedding = await generateEmbedding(data.text);

    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: data.id,
          vector: embedding,
          payload: {
            text: data.text,
            category: data.category,
            ...data.metadata,
          },
        },
      ],
    });

    logger.info({ id: data.id, category: data.category }, 'Stored product data in vector DB');
  } catch (error) {
    logger.error({ error, id: data.id }, 'Error storing product data');
    throw error;
  }
}

export async function storeProductDataBatch(dataList: ProductData[]): Promise<void> {
  try {
    const client = getQdrantClient();
    
    const points = await Promise.all(
      dataList.map(async (data) => {
        const embedding = await generateEmbedding(data.text);
        return {
          id: data.id,
          vector: embedding,
          payload: {
            text: data.text,
            category: data.category,
            ...data.metadata,
          },
        };
      })
    );

    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    logger.info({ count: dataList.length }, 'Stored batch product data in vector DB');
  } catch (error) {
    logger.error({ error, count: dataList.length }, 'Error storing batch product data');
    throw error;
  }
}

export async function searchSimilar(queryText: string, topK: number = 3): Promise<SearchResult[]> {
  try {
    const client = getQdrantClient();
    const queryEmbedding = await generateEmbedding(queryText);

    const searchResult = await client.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
    });

    const results: SearchResult[] = searchResult.map((result: any) => ({
      id: result.id.toString(),
      text: result.payload.text,
      category: result.payload.category,
      score: result.score,
      metadata: result.payload.metadata,
    }));

    logger.info({ queryLength: queryText.length, resultsCount: results.length, topK }, 'Searched similar vectors');
    return results;
  } catch (error) {
    logger.error({ error, queryLength: queryText.length }, 'Error searching similar vectors');
    throw error;
  }
}

export async function deleteProductData(id: string): Promise<void> {
  try {
    const client = getQdrantClient();
    await client.delete(COLLECTION_NAME, {
      wait: true,
      points: [id],
    });

    logger.info({ id }, 'Deleted product data from vector DB');
  } catch (error) {
    logger.error({ error, id }, 'Error deleting product data');
    throw error;
  }
}

export async function getAllProductData(): Promise<SearchResult[]> {
  try {
    const client = getQdrantClient();
    const scrollResult = await client.scroll(COLLECTION_NAME, {
      limit: 100,
      with_payload: true,
      with_vector: false,
    });

    const results: SearchResult[] = scrollResult.points.map((point: any) => ({
      id: point.id.toString(),
      text: point.payload.text,
      category: point.payload.category,
      score: 1.0,
      metadata: point.payload.metadata,
    }));

    logger.info({ count: results.length }, 'Retrieved all product data');
    return results;
  } catch (error) {
    logger.error({ error }, 'Error retrieving all product data');
    throw error;
  }
}
