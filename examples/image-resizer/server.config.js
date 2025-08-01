// Server configuration for Motia
// This file configures Express middleware including body parser limits

module.exports = {
  // Increase body parser limit to handle large base64 images
  bodyParser: {
    json: {
      limit: '50mb' // Allow up to 50MB for base64 encoded images
    },
    urlencoded: {
      limit: '50mb',
      extended: true
    }
  }
};