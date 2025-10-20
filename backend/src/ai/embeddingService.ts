import { GoogleGenAI } from '@google/genai';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.warn('GEMINI_API_KEY not set. Embedding service will not be available.');
}

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI && GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  if (!genAI) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const ai = getGenAI();
    
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: [{ role: 'user', parts: [{ text }] }],
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding || embedding.length === 0) {
      logger.error({ response }, 'Empty or missing embeddings in response');
      throw new Error('Empty embedding returned from API');
    }

    logger.debug({ textLength: text.length, embeddingSize: embedding.length }, 'Generated embedding');
    return embedding;
  } catch (error) {
    logger.error({ error, textLength: text.length }, 'Error generating embedding');
    throw error;
  }
}

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(texts.map(text => generateEmbedding(text)));
    logger.info({ count: embeddings.length }, 'Generated batch embeddings');
    return embeddings;
  } catch (error) {
    logger.error({ error, count: texts.length }, 'Error generating batch embeddings');
    throw error;
  }
}
