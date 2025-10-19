import { GoogleGenAI } from "@google/genai";
import pino from 'pino';

// Referenced from blueprint:javascript_gemini integration
// Using Gemini Developer API Key (not Vertex AI)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

export type EmailCategory = "Interested" | "Meeting Booked" | "Not Interested" | "Spam" | "Out of Office";

export interface EmailCategorizationResult {
  category: EmailCategory;
}

const systemInstruction = `You are an expert email classifier. Your task is to analyze the provided email text and categorize it into one of the following labels:

1. "Interested" - The sender shows interest in a product, service, or proposal. They may ask questions, request more information, or express positive sentiment.
2. "Meeting Booked" - The email confirms, schedules, or discusses a meeting. Look for calendar invites, meeting times, or confirmation of scheduled calls.
3. "Not Interested" - The sender explicitly declines, shows disinterest, or politely rejects an offer or proposal.
4. "Spam" - Unsolicited bulk email, promotional content, scams, or irrelevant automated messages.
5. "Out of Office" - Automated out-of-office replies indicating the person is unavailable.

Analyze the email subject and body carefully to determine the most appropriate category.`;

const responseSchema = {
  type: "object" as const,
  properties: {
    category: {
      type: "string" as const,
      enum: ["Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office"]
    }
  },
  required: ["category"]
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function categorizeEmailWithRetry(
  subject: string,
  body: string,
  maxRetries: number = 3
): Promise<EmailCategory | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const category = await categorizeEmail(subject, body);
      return category;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const backoffTime = Math.pow(2, attempt) * 1000;
        logger.warn(
          { attempt: attempt + 1, maxRetries, backoffTime, error: lastError.message },
          'Gemini API call failed, retrying with exponential backoff'
        );
        await sleep(backoffTime);
      }
    }
  }
  
  logger.error(
    { error: lastError, maxRetries },
    'Failed to categorize email after all retry attempts'
  );
  return null;
}

async function categorizeEmail(subject: string, body: string): Promise<EmailCategory> {
  try {
    const emailText = `Subject: ${subject}\n\nBody: ${body}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
      contents: emailText,
    });

    const rawJson = response.text;

    if (!rawJson) {
      throw new Error("Empty response from Gemini model");
    }

    const result: EmailCategorizationResult = JSON.parse(rawJson);
    
    logger.info(
      { subject, category: result.category },
      'Email categorized successfully'
    );
    
    return result.category;
  } catch (error) {
    logger.error({ error, subject }, 'Error categorizing email with Gemini');
    throw error;
  }
}
