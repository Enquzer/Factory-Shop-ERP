const fs = require('fs');
const path = require('path');

// Read the logo file and convert to base64
const logoPath = path.join(__dirname, 'public', 'logo.png');
const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });

// Write to a file
const outputPath = path.join(__dirname, 'public', 'logo-base64.txt');
fs.writeFileSync(outputPath, logoBase64);

console.log('Logo converted to base64 and saved to:', outputPath);