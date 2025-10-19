import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import pino from 'pino';
import { indexEmail, EmailDocument, updateEmailCategory } from '../elastic/elasticClient';
import { categorizeEmailWithRetry } from '../ai/emailCategorizer';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

interface ImapAccount {
  email: string;
  password: string;
  connection?: Imap;
  reconnectTimer?: NodeJS.Timeout;
}

const accounts: ImapAccount[] = [];

function createImapConnection(email: string, password: string): Imap {
  return new Imap({
    user: email,
    password: password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    keepalive: {
      interval: 10000,
      idleInterval: 300000,
      forceNoop: false
    }
  });
}

function openInbox(imap: Imap): Promise<Imap.Box> {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) reject(err);
      else resolve(box);
    });
  });
}

function searchEmails(imap: Imap, criteria: any[]): Promise<number[]> {
  return new Promise((resolve, reject) => {
    imap.search(criteria, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function fetchAndParseEmail(imap: Imap, uid: number, accountEmail: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch([uid], {
      bodies: '',
      struct: true,
      markSeen: false
    });

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream as any, async (err, parsed) => {
          if (err) {
            logger.error({ error: err, accountEmail }, 'Error parsing email');
            reject(err);
            return;
          }
          
          await logAndIndexEmail(parsed, accountEmail);
          resolve();
        });
      });
    });

    fetch.once('error', (err) => {
      logger.error({ error: err, accountEmail }, 'Error fetching email');
      reject(err);
    });

    fetch.once('end', () => {
      resolve();
    });
  });
}

async function logAndIndexEmail(email: ParsedMail, accountEmail: string): Promise<void> {
  const from = email.from?.text || 'Unknown';
  const subject = email.subject || '(no subject)';
  const date = email.date || new Date();
  const textBody = email.text || '';

  logger.info({
    account: accountEmail,
    from,
    subject,
    date: date.toISOString(),
    bodyPreview: textBody.substring(0, 100)
  }, 'Email received');

  console.log(`\n=== Email Details [${accountEmail}] ===`);
  console.log(`From: ${from}`);
  console.log(`Subject: ${subject}`);
  console.log(`Date: ${date.toISOString()}`);
  console.log(`Body preview: ${textBody.substring(0, 150)}...`);
  console.log('=====================================\n');

  try {
    const emailDocument: EmailDocument = {
      subject: subject,
      body: textBody,
      accountId: accountEmail,
      folder: 'INBOX',
      date: date,
      indexedAt: new Date()
    };

    const documentId = await indexEmail(emailDocument);
    logger.info({ accountEmail, subject, documentId }, 'Email indexed in Elasticsearch');

    if (process.env.GEMINI_API_KEY) {
      const category = await categorizeEmailWithRetry(subject, textBody);
      
      if (category) {
        await updateEmailCategory(documentId, category);
        console.log(`🏷️  Email categorized as: ${category}`);
        logger.info({ accountEmail, subject, category, documentId }, 'Email categorized and updated');
      } else {
        logger.warn({ accountEmail, subject, documentId }, 'Failed to categorize email after retries');
        console.log(`⚠️  Failed to categorize email: ${subject}`);
      }
    } else {
      logger.info({ accountEmail, subject }, 'GEMINI_API_KEY not set, skipping AI categorization');
    }
  } catch (error) {
    logger.error({ error, accountEmail, subject }, 'Failed to index email in Elasticsearch');
  }
}

async function fetchRecentEmails(imap: Imap, accountEmail: string): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = thirtyDaysAgo.getDate();
    const month = monthNames[thirtyDaysAgo.getMonth()];
    const year = thirtyDaysAgo.getFullYear();
    const sinceDate = `${day}-${month}-${year}`;

    logger.info({ accountEmail, sinceDate }, 'Fetching emails from last 30 days');

    const results = await searchEmails(imap, [['SINCE', sinceDate]]);
    
    logger.info({ accountEmail, count: results.length }, 'Found emails from last 30 days');

    if (results.length === 0) {
      logger.info({ accountEmail }, 'No emails found in the last 30 days');
      return;
    }
    
    for (const uid of results) {
      try {
        await fetchAndParseEmail(imap, uid, accountEmail);
      } catch (error) {
        logger.error({ error, uid, accountEmail }, 'Error processing email');
      }
    }

    logger.info({ accountEmail, fetched: results.length }, 'Initial email sync completed');
  } catch (error) {
    logger.error({ error, accountEmail }, 'Error fetching recent emails');
    throw error;
  }
}

function setupIdleMode(imap: Imap, accountEmail: string, account: ImapAccount): void {
  imap.on('mail', async (numNewMsgs: number) => {
    logger.info({ accountEmail, numNewMsgs }, 'New email notification received');
    console.log(`\n🔔 ${numNewMsgs} new email(s) detected for ${accountEmail}`);

    try {
      const results = await searchEmails(imap, ['UNSEEN']);
      
      if (results.length === 0) {
        logger.info({ accountEmail }, 'No unseen messages found');
        return;
      }

      logger.info({ accountEmail, count: results.length }, 'Fetching unseen emails');

      for (const uid of results) {
        try {
          await fetchAndParseEmail(imap, uid, accountEmail);
        } catch (error) {
          logger.error({ error, uid, accountEmail }, 'Error processing new email');
        }
      }
    } catch (error) {
      logger.error({ error, accountEmail }, 'Error handling new mail notification');
    }
  });

  scheduleReconnect(account);
}

function scheduleReconnect(account: ImapAccount): void {
  if (account.reconnectTimer) {
    clearTimeout(account.reconnectTimer);
  }

  account.reconnectTimer = setTimeout(() => {
    logger.info({ email: account.email }, 'Reconnecting to refresh IDLE connection (29 min timeout)');
    
    if (account.connection) {
      account.connection.end();
    }
    
    setTimeout(() => {
      connectToAccount(account);
    }, 2000);
  }, 29 * 60 * 1000);
}

async function connectToAccount(account: ImapAccount): Promise<void> {
  const { email, password } = account;
  
  const imap = createImapConnection(email, password);
  account.connection = imap;

  imap.once('ready', async () => {
    logger.info({ email }, 'Connected to IMAP server');
    console.log(`✅ Connected to Gmail IMAP: ${email}`);

    try {
      const box = await openInbox(imap);
      logger.info({ email, totalMessages: box.messages.total }, 'Inbox opened');
      console.log(`📬 Inbox opened: ${box.messages.total} total messages for ${email}`);

      await fetchRecentEmails(imap, email);

      logger.info({ email }, 'Entering IDLE mode for real-time notifications');
      console.log(`👂 Listening for new emails via IDLE: ${email}\n`);

      setupIdleMode(imap, email, account);
    } catch (error) {
      logger.error({ error, email }, 'Error during initial setup');
    }
  });

  imap.once('error', (err: Error) => {
    logger.error({ error: err, email }, 'IMAP connection error');
    console.error(`❌ IMAP Error for ${email}:`, err.message);
    
    setTimeout(() => {
      logger.info({ email }, 'Attempting to reconnect after error');
      connectToAccount(account);
    }, 5000);
  });

  imap.once('end', () => {
    logger.info({ email }, 'IMAP connection ended');
    console.log(`📴 Connection ended for ${email}`);
  });

  imap.connect();
}

export async function startImapSync(): Promise<void> {
  const email1 = process.env.IMAP_EMAIL_1;
  const password1 = process.env.IMAP_PASS_1;
  const email2 = process.env.IMAP_EMAIL_2;
  const password2 = process.env.IMAP_PASS_2;

  if (!email1 || !password1) {
    logger.warn('IMAP_EMAIL_1 or IMAP_PASS_1 not configured. Skipping account 1.');
  } else {
    accounts.push({ email: email1, password: password1 });
  }

  if (!email2 || !password2) {
    logger.warn('IMAP_EMAIL_2 or IMAP_PASS_2 not configured. Skipping account 2.');
  } else {
    accounts.push({ email: email2, password: password2 });
  }

  if (accounts.length === 0) {
    logger.error('No IMAP accounts configured. Please set environment variables.');
    console.error('⚠️  No IMAP accounts configured. Please set IMAP_EMAIL_1, IMAP_PASS_1, etc. in .env file');
    return;
  }

  logger.info({ accountCount: accounts.length }, 'Starting IMAP sync for configured accounts');
  console.log(`\n🚀 Starting IMAP sync for ${accounts.length} account(s)...\n`);

  for (const account of accounts) {
    await connectToAccount(account);
  }

  process.on('SIGINT', () => {
    logger.info('Shutting down IMAP connections');
    console.log('\n⏹️  Shutting down IMAP connections...');
    
    accounts.forEach(account => {
      if (account.reconnectTimer) {
        clearTimeout(account.reconnectTimer);
      }
      if (account.connection) {
        account.connection.end();
      }
    });
    
    process.exit(0);
  });
}
