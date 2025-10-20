import { storeProductDataBatch } from '../vector/vectorStorageService';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const defaultProductData = [
  {
    id: 'product-meeting-link',
    text: `Our team uses Calendly for scheduling meetings. You can book a meeting with us at: https://calendly.com/your-team/30min
    
We offer 30-minute introductory calls to discuss your needs and how our product can help solve your challenges.`,
    category: 'meeting_scheduling',
    metadata: {
      type: 'meeting_link',
      priority: 'high',
    },
  },
  {
    id: 'product-features-overview',
    text: `Our product is an AI-powered email management platform that includes:

1. Intelligent Email Categorization - Automatically categorize emails as Interested, Meeting Booked, Not Interested, Spam, or Out of Office using AI
2. Real-time Email Synchronization - Connect multiple Gmail accounts with IMAP for instant email updates
3. Advanced Search - Full-text search across all your emails with powerful filtering
4. AI-Powered Suggested Replies - Get intelligent, context-aware reply suggestions using RAG technology
5. Webhook Notifications - Receive instant Slack notifications for interested leads
6. Analytics Dashboard - Track email metrics and response patterns

Perfect for sales teams, customer support, and business development professionals who need to manage high email volumes efficiently.`,
    category: 'product_features',
    metadata: {
      type: 'features',
      priority: 'high',
    },
  },
  {
    id: 'product-pricing',
    text: `Our pricing is simple and transparent:

Starter Plan: $29/month per user
- Up to 2 email accounts
- AI email categorization
- Basic search
- 100 AI reply suggestions/month

Professional Plan: $79/month per user
- Up to 5 email accounts
- AI email categorization
- Advanced search
- Unlimited AI reply suggestions
- Webhook integrations
- Priority support

Enterprise Plan: Custom pricing
- Unlimited email accounts
- Everything in Professional
- Custom integrations
- Dedicated account manager
- SLA guarantees

All plans include a 14-day free trial with no credit card required.`,
    category: 'pricing',
    metadata: {
      type: 'pricing',
      priority: 'high',
    },
  },
  {
    id: 'product-integration',
    text: `Our platform integrates seamlessly with your existing tools:

Email Providers:
- Gmail (via IMAP)
- Google Workspace
- Coming soon: Outlook, Microsoft 365

Productivity Tools:
- Slack (webhook notifications)
- Zapier (automation workflows)
- Calendly (meeting scheduling)

Data & Analytics:
- Elasticsearch for powerful search
- Custom API for building integrations
- Webhook support for real-time events

We also offer a REST API for custom integrations. Documentation is available at docs.yourcompany.com/api`,
    category: 'integrations',
    metadata: {
      type: 'integrations',
      priority: 'medium',
    },
  },
  {
    id: 'product-security',
    text: `Security and privacy are our top priorities:

Data Protection:
- End-to-end encryption for all email data
- SOC 2 Type II certified
- GDPR compliant
- Data stored in secure, redundant data centers

Access Control:
- OAuth 2.0 authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Audit logs for all activities

Email Security:
- Read-only IMAP access (we never delete or modify emails)
- Secure credential storage
- Regular security audits
- Penetration testing quarterly

Your email credentials are encrypted and never shared with third parties.`,
    category: 'security',
    metadata: {
      type: 'security',
      priority: 'medium',
    },
  },
  {
    id: 'product-support',
    text: `Our support team is here to help:

Support Channels:
- Email: support@yourcompany.com (response within 24 hours)
- Live Chat: Available Monday-Friday, 9 AM - 6 PM EST
- Knowledge Base: docs.yourcompany.com
- Video Tutorials: youtube.com/yourcompany

For Enterprise customers:
- Dedicated account manager
- Priority email and phone support
- Quarterly business reviews
- Custom onboarding and training

Community:
- Join our Slack community: community.yourcompany.com
- Monthly webinars on best practices
- User forum for tips and tricks`,
    category: 'support',
    metadata: {
      type: 'support',
      priority: 'medium',
    },
  },
  {
    id: 'product-case-study',
    text: `Success Story: TechStartup Inc.

Challenge: TechStartup's sales team was drowning in 500+ daily emails, missing hot leads buried in spam and automated messages.

Solution: Implemented our AI email categorization and suggested replies.

Results after 3 months:
- 40% reduction in email response time
- 85% accuracy in lead categorization
- 60% of replies drafted using AI suggestions
- 3x increase in qualified meetings booked
- Sales team productivity increased by 35%

"This tool transformed how we handle inbound leads. We're now catching opportunities we would have missed before." - Sarah Chen, VP of Sales, TechStartup Inc.`,
    category: 'case_study',
    metadata: {
      type: 'testimonial',
      priority: 'low',
    },
  },
];

export async function seedDefaultProductData(): Promise<void> {
  try {
    logger.info('Starting to seed default product data...');
    await storeProductDataBatch(defaultProductData);
    logger.info({ count: defaultProductData.length }, 'Successfully seeded default product data');
  } catch (error) {
    logger.error({ error }, 'Error seeding default product data');
    throw error;
  }
}

export { defaultProductData };
