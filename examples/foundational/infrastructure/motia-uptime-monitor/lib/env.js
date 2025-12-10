/**
 * Environment configuration module for Motia Uptime Monitor
 * Handles parsing and validation of all environment variables
 */

/**
 * Validates if a string is a valid Discord webhook URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Discord webhook URL
 */
function isValidDiscordWebhook(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com';
  } catch {
    return false;
  }
}

/**
 * Parses and validates the SITES environment variable
 * @param {string} sitesJson - JSON string of site URLs
 * @returns {string[]} - Array of validated URLs
 */
function parseSites(sitesJson) {
  if (!sitesJson) {
    throw new Error('SITES environment variable is required');
  }

  let sites;
  try {
    sites = JSON.parse(sitesJson);
  } catch (error) {
    throw new Error(`Invalid SITES JSON format: ${error.message}`);
  }

  if (!Array.isArray(sites)) {
    throw new Error('SITES must be a JSON array of URLs');
  }

  if (sites.length === 0) {
    throw new Error('SITES array cannot be empty');
  }

  // Validate each URL
  for (const site of sites) {
    if (typeof site !== 'string') {
      throw new Error(`Invalid site URL: ${site} (must be string)`);
    }
    
    try {
      new URL(site);
    } catch {
      throw new Error(`Invalid site URL format: ${site}`);
    }
  }

  return sites;
}

/**
 * Validates cron expression format (basic validation)
 * @param {string} cron - Cron expression
 * @returns {boolean} - True if appears to be valid cron format
 */
function isValidCron(cron) {
  if (!cron || typeof cron !== 'string') return false;
  
  // Basic validation: should have 5 parts separated by spaces
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5;
}

// Parse and validate environment variables
const discordWebhook = process.env.DISCORD_WEBHOOK;
if (!discordWebhook) {
  throw new Error('DISCORD_WEBHOOK environment variable is required');
}

if (!isValidDiscordWebhook(discordWebhook)) {
  throw new Error('DISCORD_WEBHOOK must be a valid Discord webhook URL');
}

const sites = parseSites(process.env.SITES);

const cron = process.env.CHECK_INTERVAL_CRON || '*/1 * * * *';
if (!isValidCron(cron)) {
  throw new Error(`Invalid CHECK_INTERVAL_CRON format: ${cron}`);
}

const alertBurst = process.env.ALERT_BURST ? parseInt(process.env.ALERT_BURST) : 3;
if (alertBurst <= 0) {
  throw new Error('ALERT_BURST must be a positive integer');
}

const alertWindowSec = process.env.ALERT_WINDOW_SEC ? parseInt(process.env.ALERT_WINDOW_SEC) : 300;
if (alertWindowSec <= 0) {
  throw new Error('ALERT_WINDOW_SEC must be a positive integer');
}

export const config = {
  discordWebhook,
  sites,
  cron,
  alertBurst,
  alertWindowSec
};