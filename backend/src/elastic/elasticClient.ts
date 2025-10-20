import { Client } from "@elastic/elasticsearch";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST;
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY;

// Log the configuration for debugging
console.log("🔍 Elasticsearch Configuration:");
console.log("ELASTICSEARCH_HOST:", ELASTICSEARCH_HOST);
console.log("ELASTIC_API_KEY exists:", !!ELASTIC_API_KEY);

logger.info(
  {
    ELASTICSEARCH_HOST,
    ELASTIC_API_KEY_SET: !!ELASTIC_API_KEY,
  },
  "Elasticsearch configuration loaded",
);

export const esClient = new Client({
  node: ELASTICSEARCH_HOST,
  auth: ELASTIC_API_KEY
    ? {
        apiKey: ELASTIC_API_KEY,
      }
    : undefined,
});

const INDEX_NAME = "emails";

const INDEX_MAPPING = {
  properties: {
    subject: {
      type: "text" as const,
    },
    body: {
      type: "text" as const,
    },
    accountId: {
      type: "keyword" as const,
    },
    folder: {
      type: "keyword" as const,
    },
    aiCategory: {
      type: "keyword" as const,
    },
    date: {
      type: "date" as const,
    },
    indexedAt: {
      type: "date" as const,
    },
  },
};

export async function ensureIndex(): Promise<void> {
  try {
    const indexExists = await esClient.indices.exists({ index: INDEX_NAME });

    if (!indexExists) {
      logger.info({ index: INDEX_NAME }, "Creating Elasticsearch index");
      console.log(`Creating Elasticsearch index: ${INDEX_NAME}`);

      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: INDEX_MAPPING,
      });

      logger.info(
        { index: INDEX_NAME },
        "Elasticsearch index created successfully",
      );
      console.log(`✅ Elasticsearch index created: ${INDEX_NAME}`);
    } else {
      logger.info({ index: INDEX_NAME }, "Elasticsearch index already exists");
      console.log(`✅ Elasticsearch index exists: ${INDEX_NAME}`);
    }
  } catch (error) {
    logger.error(
      { error, index: INDEX_NAME },
      "Error ensuring Elasticsearch index",
    );
    console.error("❌ Error ensuring Elasticsearch index:", error);
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

export async function indexEmail(email: EmailDocument): Promise<string> {
  try {
    const response = await esClient.index({
      index: INDEX_NAME,
      document: email,
    });

    logger.info(
      {
        accountId: email.accountId,
        subject: email.subject,
        documentId: response._id,
      },
      "Email indexed in Elasticsearch",
    );
    return response._id;
  } catch (error) {
    logger.error({ error, email }, "Error indexing email in Elasticsearch");
    throw error;
  }
}

export async function updateEmailCategory(
  documentId: string,
  category: string,
): Promise<void> {
  try {
    await esClient.update({
      index: INDEX_NAME,
      id: documentId,
      doc: {
        aiCategory: category,
      },
    });

    logger.info(
      { documentId, category },
      "Email category updated in Elasticsearch",
    );
  } catch (error) {
    logger.error(
      { error, documentId, category },
      "Error updating email category in Elasticsearch",
    );
    throw error;
  }
}

export interface SearchEmailsParams {
  query?: string;
  accountId?: string;
  folder?: string;
  from?: number;
  size?: number;
}

export async function searchEmails(params: SearchEmailsParams) {
  try {
    const { query, accountId, folder, from = 0, size = 20 } = params;

    const must: any[] = [];
    const should: any[] = [];

    if (query && query.trim()) {
      should.push({
        multi_match: {
          query: query,
          fields: ["subject^2", "body"],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      });
    }

    if (accountId) {
      must.push({ term: { accountId } });
    }

    if (folder) {
      must.push({ term: { folder } });
    }

    const body: any = {
      from,
      size,
      sort: [{ date: { order: "desc" } }],
      query: {
        bool: {
          must: must.length > 0 ? must : undefined,
          should: should.length > 0 ? should : undefined,
          minimum_should_match: should.length > 0 ? 1 : undefined,
        },
      },
    };

    if (must.length === 0 && should.length === 0) {
      body.query = { match_all: {} };
    }

    const response = await esClient.search({
      index: INDEX_NAME,
      body,
    });

    return {
      total:
        typeof response.hits.total === "number"
          ? response.hits.total
          : response.hits.total?.value || 0,
      emails: response.hits.hits.map((hit) => ({
        id: hit._id,
        ...(hit._source as any),
      })),
    };
  } catch (error) {
    logger.error({ error, params }, "Error searching emails in Elasticsearch");
    throw error;
  }
}

export async function getUniqueAccounts(): Promise<string[]> {
  try {
    const response = await esClient.search({
      index: INDEX_NAME,
      body: {
        size: 0,
        aggs: {
          unique_accounts: {
            terms: {
              field: "accountId",
              size: 100,
            },
          },
        },
      },
    });

    const buckets = response.aggregations?.unique_accounts as any;
    return buckets?.buckets?.map((b: any) => b.key) || [];
  } catch (error) {
    logger.error({ error }, "Error getting unique accounts from Elasticsearch");
    return [];
  }
}
