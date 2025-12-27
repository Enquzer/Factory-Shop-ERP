
const path = require('path');
const root = process.cwd();

try {
    console.log('Testing imports...');
    const productsSqlite = require(path.join(root, 'src/lib/products-sqlite'));
    console.log('products-sqlite imported');
    const orders = require(path.join(root, 'src/lib/orders'));
    console.log('orders imported');
    const shops = require(path.join(root, 'src/lib/shops'));
    console.log('shops imported');
    const assistant = require(path.join(root, 'src/lib/assistant-logic'));
    console.log('assistant-logic imported');

    console.log('Testing processAssistantQuery...');
    assistant.processAssistantQuery('how many shops').then(res => {
        console.log('Result:', res.answer);
    }).catch(err => {
        console.error('Execution failed:', err);
    });
} catch (err) {
    console.error('Import failed:', err);
    console.error(err.stack);
}
