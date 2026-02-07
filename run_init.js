const { initializeDriversTables } = require('./src/lib/drivers-sqlite');

async function test() {
  console.log('Running initializeDriversTables manually...');
  await initializeDriversTables();
  console.log('Done');
}

test().catch(console.error);
