// steps/github-webhook-receiver.step.js
const crypto = require('crypto');
const { subscribe } = require('diagnostics_channel');

const config = {
  type: 'api',
  name: 'github-webhook-receiver',
  path: '/webhook/github',
  method: 'POST',
  emits: ['repository-webhook'],
  flows: ['documentation-guardian']
};

function verifyGitHubSignature(payload, signature, secret, logger) {
  if (!signature || !secret) {
    logger.info("No signature or secret provided, skipping verification");
    return true;
  }
  
  try {
    // Convert the payload to string if it's not already
    const payloadStr = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    // Create HMAC
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadStr);
    const computedSignature = 'sha256=' + hmac.digest('hex');
    
    logger.info(`Expected signature: ${signature}`);
    logger.info(`Computed signature: ${computedSignature}`);
    
    return computedSignature === signature;
    
  } catch (error) {
    logger.error("Signature verification error:", error);
    return false;
  }
}

const handler = async (req, context) => {
  const { emit, logger } = context;
  
  // Get the signature from the headers
  const signature = req.headers['x-hub-signature-256'];
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  
  logger.info("Webhook secret", webhookSecret);
  logger.info("Signature received", signature);
  logger.info("Received GitHub webhook request");

  // Verification check
  if (req.headers['user-agent'] && req.headers['user-agent'].includes('curl')) {
    // This is a test request from curl, accept it
    logger.info("Test request detected, bypassing signature verification");
  } else if (!verifyGitHubSignature(req.body, signature, webhookSecret, logger)) {
    logger.warn("Invalid webhook signature - rejecting request");
    return {
      status: 401,
      body: { error: "Invalid signature" }
    };
  }
  
  logger.info("Webhook accepted");
  
  // Emit event with the webhook payload
  await emit({
    topic: "repository-webhook",
    data: req.body
  });
  
  return {
    status: 200,
    body: { status: "received" }
  };
};

module.exports = { config, handler };