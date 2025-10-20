require('dotenv').config();

console.log('🔍 Debugging IMAP Configuration:');
console.log('IMAP_EMAIL_1:', process.env.IMAP_EMAIL_1);
console.log('IMAP_PASS_1:', process.env.IMAP_PASS_1 ? 'SET' : 'NOT SET');
console.log('IMAP_EMAIL_2:', process.env.IMAP_EMAIL_2);
console.log('IMAP_PASS_2:', process.env.IMAP_PASS_2 ? 'SET' : 'NOT SET');
console.log('IMAP_PASS_2 value:', JSON.stringify(process.env.IMAP_PASS_2));

// Test the logic from startImapSync
const email1 = process.env.IMAP_EMAIL_1;
const password1 = process.env.IMAP_PASS_1;
const email2 = process.env.IMAP_EMAIL_2;
const password2 = process.env.IMAP_PASS_2;

const accounts = [];

if (!email1 || !password1) {
    console.log('❌ IMAP_EMAIL_1 or IMAP_PASS_1 not configured. Skipping account 1.');
} else {
    accounts.push({ email: email1, password: password1 });
    console.log('✅ Account 1 added:', email1);
}

if (!email2 || !password2) {
    console.log('❌ IMAP_EMAIL_2 or IMAP_PASS_2 not configured. Skipping account 2.');
} else {
    accounts.push({ email: email2, password: password2 });
    console.log('✅ Account 2 added:', email2);
}

console.log('📊 Total accounts configured:', accounts.length);

if (accounts.length === 0) {
    console.log('❌ No IMAP accounts configured!');
} else {
    console.log('✅ IMAP sync should start with', accounts.length, 'account(s)');
}
