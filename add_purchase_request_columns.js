// Manual SQL migration - run these commands in your SQLite database

/*
Run these SQL commands in your database:

ALTER TABLE purchase_requests ADD COLUMN costPerUnit REAL;
ALTER TABLE purchase_requests ADD COLUMN supplier TEXT;
ALTER TABLE purchase_requests ADD COLUMN notes TEXT;
ALTER TABLE purchase_requests ADD COLUMN rejectionReason TEXT;

Or run this script with: npm run migrate-purchase-requests
*/

console.log('Please run the following SQL commands in your database:');
console.log('');
console.log('ALTER TABLE purchase_requests ADD COLUMN costPerUnit REAL;');
console.log('ALTER TABLE purchase_requests ADD COLUMN supplier TEXT;');
console.log('ALTER TABLE purchase_requests ADD COLUMN notes TEXT;');
console.log('ALTER TABLE purchase_requests ADD COLUMN rejectionReason TEXT;');
console.log('');
console.log('Or restart your Next.js server - the database will auto-initialize with these columns.');