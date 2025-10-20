require('dotenv').config();
const { startImapSync } = require('./dist/imap/imapClient');

console.log('🚀 Starting IMAP sync test...');
console.log('IMAP_EMAIL_1:', process.env.IMAP_EMAIL_1);
console.log('IMAP_PASS_1:', process.env.IMAP_PASS_1 ? 'SET' : 'NOT SET');

startImapSync().then(() => {
  console.log('✅ IMAP sync started successfully');
}).catch((error) => {
  console.error('❌ IMAP sync failed:', error);
});
