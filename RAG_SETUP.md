# AI-Powered Suggested Replies (RAG) Setup Guide

This guide will help you set up and use the Retrieval-Augmented Generation (RAG) feature for AI-powered email reply suggestions.

## Overview

The RAG feature uses a Vector Database (Qdrant) combined with Google's Gemini AI to generate intelligent, context-aware email reply suggestions based on your product knowledge and outreach agenda.

## Architecture

The RAG pipeline works in the following steps:

1. **Product Data Storage**: Your product information, meeting links, pricing, and FAQs are stored as text chunks in Qdrant vector database
2. **Embedding Generation**: When a user requests a reply suggestion, the email content is converted to embeddings using Gemini API
3. **Vector Search**: The system searches for the most relevant product data based on the email content
4. **Reply Generation**: Gemini AI generates a professional reply using both the email context and retrieved product information

## Prerequisites

1. **Gemini API Key**: Already configured in your environment
2. **Qdrant Cloud Account**: Free tier available at https://cloud.qdrant.io

## Setup Instructions

### Step 1: Create a Qdrant Cloud Account

1. Visit https://cloud.qdrant.io
2. Sign up for a free account
3. Create a new cluster (free tier: 1GB storage)
4. Note your cluster URL (e.g., `https://your-cluster.qdrant.cloud`)
5. Create an API key from the cluster settings

### Step 2: Configure Environment Variables

Add the following to your `.env` file in the `backend` directory:

```bash
# Qdrant Configuration
QDRANT_URL=https://your-cluster.qdrant.cloud
QDRANT_API_KEY=your_qdrant_api_key_here

# Seed default product data on startup (optional)
SEED_PRODUCT_DATA=true
```

The `GEMINI_API_KEY` should already be configured from the previous setup.

### Step 3: Restart the Backend

The backend will automatically:
- Connect to Qdrant
- Create the `product_knowledge` collection
- Seed default product data (if `SEED_PRODUCT_DATA=true`)

Check the backend logs for confirmation:
```
Initializing Qdrant vector database...
Qdrant collection created: product_knowledge
Seeding default product data...
Successfully seeded default product data
Qdrant vector database ready
```

### Step 4: Customize Product Data (Optional)

The system comes with default product data including:
- Meeting scheduling links
- Product features overview
- Pricing information
- Integration details
- Security & compliance info
- Support channels
- Case studies

To customize this data:

1. Edit `backend/src/utils/seedProductData.ts`
2. Update the `defaultProductData` array with your actual product information
3. Restart the backend with `SEED_PRODUCT_DATA=true`

### Step 5: Add Product Data via API (Optional)

You can also add product data programmatically:

**Add a single item:**
```bash
curl -X POST http://localhost:3000/api/product-data \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Our product pricing starts at $29/month...",
    "category": "pricing",
    "metadata": {
      "type": "pricing_info",
      "priority": "high"
    }
  }'
```

**Add multiple items:**
```bash
curl -X POST http://localhost:3000/api/product-data/batch \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "text": "We offer 24/7 support...",
        "category": "support"
      },
      {
        "text": "Book a demo at calendly.com/your-link",
        "category": "meeting_scheduling"
      }
    ]
  }'
```

**View all product data:**
```bash
curl http://localhost:3000/api/product-data
```

## Using the Feature

### Frontend UI

1. Open an email in the application
2. Click the **"✨ Suggest Reply"** button
3. Wait for the AI to generate a suggested reply (usually 2-5 seconds)
4. Review the suggested reply and the context used
5. Click **"📋 Copy Reply"** to copy to clipboard
6. Paste and customize as needed in your email client

### API Usage

**Generate a suggested reply:**
```bash
curl -X POST http://localhost:3000/api/emails/{email_id}/suggest-reply
```

**Response:**
```json
{
  "reply": "Thank you for your interest in our product...",
  "context": [
    {
      "text": "Our product features include...",
      "category": "product_features",
      "relevance": "89.5%"
    }
  ],
  "confidence": "85.3%"
}
```

## How It Works

### RAG Pipeline Flow

1. **User clicks "Suggest Reply"** on an email
2. **Email content is embedded** using Gemini's `text-embedding-004` model
3. **Vector search retrieves** the top 3 most relevant product data chunks from Qdrant
4. **Prompt is assembled** with:
   - System instruction (be professional, concise, helpful)
   - Retrieved context from vector DB
   - Original email content
5. **Gemini generates** a reply using `gemini-2.0-flash-exp` model
6. **Reply is returned** with confidence score and context used

### Customization Options

#### Adjust Context Retrieval

In `backend/src/routes/ragRoutes.ts`, you can adjust the `topK` parameter:

```typescript
const suggestion = await suggestReply({
  subject: email.subject,
  body: email.body,
  from: email.from,
  date: email.date,
}, 5); // Retrieve top 5 most relevant contexts instead of 3
```

#### Modify System Instructions

Edit the system instruction in `backend/src/ai/ragService.ts` to change the tone or style of generated replies.

## Troubleshooting

### "RAG features will be unavailable"

**Cause**: Missing `QDRANT_URL` or `GEMINI_API_KEY`
**Solution**: Ensure both environment variables are set in `.env`

### "Failed to generate suggested reply"

**Possible causes:**
1. Qdrant cluster is down or unreachable
2. Gemini API rate limit exceeded
3. No product data in vector database

**Solutions:**
- Check Qdrant cluster status in cloud console
- Verify API keys are correct
- Seed product data using `SEED_PRODUCT_DATA=true`

### Low Confidence Scores

**Cause**: No relevant product data for the email topic
**Solution**: Add more specific product information covering common customer questions and topics

## Performance Considerations

- **Embedding generation**: ~200-500ms per request
- **Vector search**: ~50-100ms
- **Reply generation**: ~1-3 seconds
- **Total**: ~2-5 seconds per suggestion

For high-volume usage, consider:
- Caching embeddings for frequently asked questions
- Using batch processing for multiple emails
- Implementing rate limiting on the frontend

## Best Practices

1. **Keep product data updated**: Regularly review and update your product information in the vector DB
2. **Organize by category**: Use meaningful categories (pricing, features, support, etc.) to track what context is being used
3. **Monitor confidence scores**: Low confidence suggests missing or irrelevant product data
4. **Review context used**: Check which product data chunks are being retrieved to improve relevance
5. **Customize replies**: Use AI suggestions as a starting point, then personalize for each recipient

## Security & Privacy

- Email data is only sent to Gemini API for reply generation (never stored by Google)
- Product data is stored in your Qdrant cluster
- API keys should be kept secure and never committed to version control
- All communication uses HTTPS/TLS encryption

## Cost Estimation

### Qdrant Cloud (Free Tier)
- 1GB storage: **Free**
- ~10,000-50,000 vectors depending on text length

### Gemini API
- Embeddings: $0.00001 per 1K characters (~$0.01 per 1,000 emails)
- Reply generation: $0.00015 per 1K characters (~$0.15 per 1,000 replies)

**Estimated cost for 1,000 suggestions**: ~$0.16

## Next Steps

1. ✅ Set up Qdrant Cloud account and configure environment variables
2. ✅ Verify backend starts successfully with Qdrant connection
3. ✅ Review and customize default product data
4. ✅ Test reply suggestions on sample emails
5. ✅ Monitor context relevance and adjust product data as needed
6. ✅ Train your team on using the feature effectively

## Support

For issues or questions:
- Check backend logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure Qdrant cluster is accessible
- Check Gemini API quota and rate limits
