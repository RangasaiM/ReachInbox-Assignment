import fetch from 'node-fetch';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

export interface EmailData {
  subject: string;
  body: string;
  from: string;
  accountId: string;
  category: string;
  date: Date;
  documentId: string;
}

interface SlackPayload {
  text: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

interface GenericWebhookPayload {
  event: string;
  email: {
    subject: string;
    from: string;
    accountId: string;
    category: string;
    date: string;
    documentId: string;
    bodyPreview: string;
  };
  timestamp: string;
}

export async function sendSlackNotification(emailData: EmailData): Promise<boolean> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!slackUrl) {
    logger.info('SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return false;
  }

  try {
    const payload: SlackPayload = {
      text: `🎯 New Interested Lead Detected!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 New Interested Lead!'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*From:*\n${emailData.from}`
            },
            {
              type: 'mrkdwn',
              text: `*Account:*\n${emailData.accountId}`
            },
            {
              type: 'mrkdwn',
              text: `*Subject:*\n${emailData.subject}`
            },
            {
              type: 'mrkdwn',
              text: `*Date:*\n${emailData.date.toISOString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Preview:*\n${emailData.body.substring(0, 200)}${emailData.body.length > 200 ? '...' : ''}`
          }
        }
      ]
    };

    const response = await fetch(slackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      logger.info({ subject: emailData.subject, from: emailData.from }, 'Slack notification sent successfully');
      console.log(`✅ Slack notification sent for: ${emailData.subject}`);
      return true;
    } else {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Failed to send Slack notification');
      console.error(`❌ Slack notification failed (${response.status}): ${errorText}`);
      return false;
    }
  } catch (error) {
    logger.error({ error, subject: emailData.subject }, 'Error sending Slack notification');
    console.error(`❌ Error sending Slack notification:`, error);
    return false;
  }
}

export async function sendGenericWebhook(emailData: EmailData): Promise<boolean> {
  const webhookUrl = process.env.WEBHOOK_SITE_URL;
  
  if (!webhookUrl) {
    logger.info('WEBHOOK_SITE_URL not configured, skipping generic webhook');
    return false;
  }

  try {
    const payload: GenericWebhookPayload = {
      event: 'InterestedLead',
      email: {
        subject: emailData.subject,
        from: emailData.from,
        accountId: emailData.accountId,
        category: emailData.category,
        date: emailData.date.toISOString(),
        documentId: emailData.documentId,
        bodyPreview: emailData.body.substring(0, 500)
      },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      logger.info({ subject: emailData.subject, webhookUrl }, 'Generic webhook triggered successfully');
      console.log(`✅ Generic webhook triggered for: ${emailData.subject}`);
      return true;
    } else {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Failed to trigger generic webhook');
      console.error(`❌ Generic webhook failed (${response.status}): ${errorText}`);
      return false;
    }
  } catch (error) {
    logger.error({ error, subject: emailData.subject }, 'Error triggering generic webhook');
    console.error(`❌ Error triggering generic webhook:`, error);
    return false;
  }
}

export async function triggerInterestedLeadWebhooks(emailData: EmailData): Promise<void> {
  if (emailData.category !== 'Interested') {
    logger.debug({ category: emailData.category }, 'Email not categorized as Interested, skipping webhooks');
    return;
  }

  logger.info({ subject: emailData.subject, from: emailData.from }, 'Triggering webhooks for Interested lead');
  console.log(`\n🔔 Triggering webhooks for Interested lead: ${emailData.subject}`);

  const slackPromise = sendSlackNotification(emailData);
  const webhookPromise = sendGenericWebhook(emailData);

  await Promise.allSettled([slackPromise, webhookPromise]);

  console.log('📬 Webhook notifications completed\n');
}
