const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', '(app)', 'quality-inspection', 'page.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace the hardcoded 'Quality Inspection' with the actual stage
content = content.replace(
  /downloadQcPdf\(order\.id,\s*'Quality Inspection',\s*order\.orderNumber\)/g,
  "downloadQcPdf(order.id, order.qualityInspectionStage || '', order.orderNumber)"
);

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully updated quality-inspection/page.tsx');
