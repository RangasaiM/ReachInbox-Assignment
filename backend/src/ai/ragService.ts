import { GoogleGenAI } from '@google/genai';
import { searchSimilar, SearchResult } from '../vector/vectorStorageService';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.warn('GEMINI_API_KEY not set. RAG service will not be available.');
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

export interface EmailContext {
  subject: string;
  body: string;
  from: string;
  date?: string;
}

export interface SuggestedReply {
  reply: string;
  context: SearchResult[];
  confidence: number;
}

async function generateReplyWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ai = getGenAI();

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      let text: string | undefined;
      
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          text = candidate.content.parts[0].text;
        }
      }

      if (!text || text.trim().length === 0) {
        logger.error({ response }, 'Empty or invalid response from Gemini API');
        throw new Error('Empty response from Gemini API');
      }

      return text.trim();
    } catch (error) {
      lastError = error as Error;
      logger.warn(
        { error, attempt, maxRetries },
        'Error generating reply, retrying...'
      );

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to generate reply after retries');
}

export async function suggestReply(
  emailContext: EmailContext,
  topK: number = 3
): Promise<SuggestedReply> {
  try {
    logger.info({ subject: emailContext.subject }, 'Starting RAG pipeline for email');

    const emailText = `Subject: ${emailContext.subject}\n\nFrom: ${emailContext.from}\n\n${emailContext.body}`;

    logger.debug('Retrieving relevant context from vector DB');
    const relevantContext = await searchSimilar(emailText, topK);

    if (relevantContext.length === 0) {
      logger.warn('No relevant context found in vector DB');
    }

    const contextText = relevantContext
      .map(
        (ctx, idx) =>
          `[Context ${idx + 1}] (Relevance: ${(ctx.score * 100).toFixed(1)}%)\n${ctx.text}`
      )
      .join('\n\n');

    const systemInstruction = `You are a professional email assistant that helps write thoughtful, relevant, and concise email replies.

Your task is to draft a professional email reply based ONLY on the context provided and the original email.

Guidelines:
- Be professional and courteous
- Address the sender's concerns or questions
- Use information from the provided context when relevant
- Keep the reply concise (2-4 paragraphs)
- Include a clear call-to-action if appropriate
- Do not make up information not present in the context
- If the context doesn't contain enough information, politely acknowledge the email and suggest next steps`;

    const prompt = `${systemInstruction}

===== RETRIEVED CONTEXT =====
${contextText || 'No specific context available. Provide a general professional response.'}

===== ORIGINAL EMAIL =====
Subject: ${emailContext.subject}
From: ${emailContext.from}
${emailContext.date ? `Date: ${emailContext.date}` : ''}

${emailContext.body}

===== TASK =====
Based ONLY on the context provided and the original email above, draft a professional and helpful reply. Be concise and relevant.

Reply:`;

    logger.debug('Generating reply with Gemini API');
    const reply = await generateReplyWithRetry(prompt);

    const avgConfidence = relevantContext.length > 0
      ? relevantContext.reduce((sum, ctx) => sum + ctx.score, 0) / relevantContext.length
      : 0.5;

    logger.info(
      {
        subject: emailContext.subject,
        contextsRetrieved: relevantContext.length,
        confidence: avgConfidence,
        replyLength: reply.length,
      },
      'Successfully generated suggested reply'
    );

    return {
      reply,
      context: relevantContext,
      confidence: avgConfidence,
    };
  } catch (error) {
    logger.error({ error, subject: emailContext.subject }, 'Error in RAG pipeline');
    throw error;
  }
}
