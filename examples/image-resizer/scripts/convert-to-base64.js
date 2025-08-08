#!/usr/bin/env node

/**
 * Simple utility to convert an image file to base64 for testing
 * Usage: node scripts/convert-to-base64.js path/to/image.jpg
 */

const fs = require('fs');
const path = require('path');

function convertImageToBase64(imagePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.error('❌ File not found:', imagePath);
      process.exit(1);
    }

    // Read the file
    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString('base64');
    
    // Get file info
    const fileName = path.basename(imagePath);
    const fileSize = imageBuffer.length;
    const base64Size = base64String.length;
    
    console.log('✅ File converted successfully!');
    console.log('📁 Original file:', fileName);
    console.log('📏 Original size:', (fileSize / 1024).toFixed(2), 'KB');
    console.log('📏 Base64 size:', (base64Size / 1024).toFixed(2), 'KB');
    console.log('📈 Size increase:', ((base64Size / fileSize - 1) * 100).toFixed(1) + '%');
    
    if (base64Size > 100 * 1024) {
      console.log('⚠️  WARNING: Base64 size exceeds 100KB limit!');
      console.log('   Consider using a smaller image for testing.');
    }
    
    console.log('\n📋 JSON for Postman/API testing:');
    console.log('```json');
    console.log(JSON.stringify({
      filename: fileName,
      data: base64String
    }, null, 2));
    console.log('```');
    
    // Also save to file for easy copying
    const outputFile = `${fileName}.base64.json`;
    fs.writeFileSync(outputFile, JSON.stringify({
      filename: fileName,
      data: base64String
    }, null, 2));
    
    console.log(`\n💾 Saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error converting file:', error.message);
    process.exit(1);
  }
}

// Get command line argument
const imagePath = process.argv[2];

if (!imagePath) {
  console.log('Usage: node scripts/convert-to-base64.js <image-path>');
  console.log('Example: node scripts/convert-to-base64.js ./test-image.jpg');
  process.exit(1);
}

convertImageToBase64(imagePath);