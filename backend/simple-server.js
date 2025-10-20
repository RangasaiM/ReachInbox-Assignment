require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client } = require('@elastic/elasticsearch');

console.log('🔍 Environment variables:');
console.log('ELASTICSEARCH_HOST:', process.env.ELASTICSEARCH_HOST);
console.log('ELASTIC_API_KEY:', process.env.ELASTIC_API_KEY ? 'SET' : 'NOT SET');

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;

const esClient = new Client({
  node: ELASTICSEARCH_HOST,
  auth: ELASTIC_API_KEY
    ? {
        apiKey: ELASTIC_API_KEY
      }
    : undefined
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search emails endpoint
app.get('/api/emails', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, search = '', category = '', accountId = '' } = req.query;
    const from = (parseInt(page) - 1) * parseInt(pageSize);
    const size = parseInt(pageSize);

    let query = { match_all: {} };
    
    if (search) {
      query = {
        multi_match: {
          query: search,
          fields: ['subject', 'body', 'from']
        }
      };
    }

    if (category) {
      query = {
        bool: {
          must: [query],
          filter: [{ term: { aiCategory: category } }]
        }
      };
    }

    if (accountId) {
      query = {
        bool: {
          must: [query],
          filter: [{ term: { accountId: accountId } }]
        }
      };
    }

    const response = await esClient.search({
      index: 'emails',
      body: {
        from,
        size,
        sort: [{ date: { order: 'desc' } }],
        query
      }
    });

    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
    const emails = response.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));

    res.json({
      emails,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize))
    });

  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

// Get unique accounts endpoint
app.get('/api/accounts', async (req, res) => {
  try {
    const response = await esClient.search({
      index: 'emails',
      body: {
        size: 0,
        aggs: {
          unique_accounts: {
            terms: {
              field: 'accountId',
              size: 100
            }
          }
        }
      }
    });

    const accounts = response.aggregations.unique_accounts.buckets.map(bucket => ({
      email: bucket.key,
      count: bucket.doc_count
    }));

    res.json({ accounts });

  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Test Elasticsearch connection
async function testConnection() {
  try {
    console.log('🔗 Testing Elasticsearch connection...');
    const response = await esClient.ping();
    console.log('✅ Elasticsearch connection successful!');
    
    // Test search
    const searchResponse = await esClient.search({
      index: 'emails',
      body: {
        query: { match_all: {} },
        size: 1
      }
    });
    
    console.log('✅ Search test successful!');
    console.log('📧 Total emails in index:', searchResponse.hits.total.value || searchResponse.hits.total);
    
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error.message);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await testConnection();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API available at http://localhost:${PORT}/api/emails`);
    console.log(`🔍 Health check at http://localhost:${PORT}/health`);
  });
}

startServer().catch(console.error);

