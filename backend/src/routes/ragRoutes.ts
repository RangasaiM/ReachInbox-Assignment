import express, { Request, Response } from 'express';
import { suggestReply } from '../ai/ragService';
import { esClient } from '../elastic/elasticClient';
import { storeProductData, storeProductDataBatch, getAllProductData, deleteProductData } from '../vector/vectorStorageService';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const router = express.Router();

router.post('/emails/:id/suggest-reply', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const emailDoc = await esClient.get({
      index: 'emails',
      id,
    });

    if (!emailDoc.found) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    const email: any = emailDoc._source;

    const suggestion = await suggestReply({
      subject: email.subject || '',
      body: email.body || '',
      from: email.from || '',
      date: email.date,
    });

    logger.info(
      { emailId: id, contextCount: suggestion.context.length, confidence: suggestion.confidence },
      'Successfully generated suggested reply'
    );

    res.json({
      reply: suggestion.reply,
      context: suggestion.context.map(ctx => ({
        text: ctx.text,
        category: ctx.category,
        relevance: (ctx.score * 100).toFixed(1) + '%',
      })),
      confidence: (suggestion.confidence * 100).toFixed(1) + '%',
    });
  } catch (error) {
    logger.error({ error, emailId: req.params.id }, 'Error generating suggested reply');
    res.status(500).json({ 
      error: 'Failed to generate suggested reply',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/product-data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, category, metadata } = req.body;

    if (!text || !category) {
      res.status(400).json({ error: 'text and category are required' });
      return;
    }

    const id = `product-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await storeProductData({
      id,
      text,
      category,
      metadata,
    });

    logger.info({ id, category }, 'Product data stored successfully');
    res.json({ success: true, id });
  } catch (error) {
    logger.error({ error }, 'Error storing product data');
    res.status(500).json({ 
      error: 'Failed to store product data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/product-data/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required' });
      return;
    }

    const dataList = items.map((item, index) => ({
      id: `product-${Date.now()}-${index}`,
      text: item.text,
      category: item.category,
      metadata: item.metadata,
    }));

    await storeProductDataBatch(dataList);

    logger.info({ count: dataList.length }, 'Batch product data stored successfully');
    res.json({ success: true, count: dataList.length });
  } catch (error) {
    logger.error({ error }, 'Error storing batch product data');
    res.status(500).json({ 
      error: 'Failed to store batch product data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/product-data', async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await getAllProductData();
    res.json({ data });
  } catch (error) {
    logger.error({ error }, 'Error retrieving product data');
    res.status(500).json({ 
      error: 'Failed to retrieve product data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/product-data/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteProductData(id);
    logger.info({ id }, 'Product data deleted successfully');
    res.json({ success: true });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Error deleting product data');
    res.status(500).json({ 
      error: 'Failed to delete product data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
