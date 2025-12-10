/**
 * Persistent status store for Motia Uptime Monitor
 * Manages site status data and provides snapshot functionality
 * Uses file-based storage to persist between step executions
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// File-based storage path
const STORE_FILE = join(process.cwd(), '.motia', 'status-store.json');

// Helper function to load status store from file
function loadStatusStore() {
  try {
    if (existsSync(STORE_FILE)) {
      const data = readFileSync(STORE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load status store:', error.message);
  }
  return {};
}

// Helper function to save status store to file
function saveStatusStore(store) {
  try {
    // Ensure directory exists
    const dir = join(process.cwd(), '.motia');
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Failed to save status store:', error.message);
  }
}

/**
 * Updates the last known status for a site
 * @param {Object} result - Check result object
 * @param {string} result.url - Site URL
 * @param {string} result.status - 'UP' or 'DOWN'
 * @param {number|null} result.code - HTTP status code
 * @param {number} result.responseTime - Response time in milliseconds
 * @param {string} result.checkedAt - ISO8601 timestamp
 * @param {string|null} result.error - Error message if any
 */
export function updateLastStatus(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Result must be a valid object');
  }

  if (!result.url || typeof result.url !== 'string') {
    throw new Error('Result must have a valid URL string');
  }

  if (!result.status || !['UP', 'DOWN'].includes(result.status)) {
    throw new Error('Result must have a valid status (UP or DOWN)');
  }

  if (typeof result.responseTime !== 'number' || result.responseTime < 0) {
    throw new Error('Result must have a valid responseTime (non-negative number)');
  }

  if (!result.checkedAt || typeof result.checkedAt !== 'string') {
    throw new Error('Result must have a valid checkedAt timestamp');
  }

  // Store the complete result object in persistent storage
  const store = loadStatusStore();
  store[result.url] = { ...result };
  saveStatusStore(store);
}

/**
 * Returns a snapshot of all current site statuses
 * @returns {Object} - Object with URL keys and result values
 */
export function getSnapshot() {
  const store = loadStatusStore();
  const snapshot = {};

  for (const [url, result] of Object.entries(store)) {
    snapshot[url] = { ...result };
  }

  return snapshot;
}

/**
 * Gets the previous status for a specific site
 * @param {string} url - Site URL
 * @returns {Object|null} - Previous result object or null if no previous status
 */
export function getPreviousStatus(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a valid string');
  }

  const store = loadStatusStore();
  const result = store[url];
  return result ? { ...result } : null;
}

/**
 * Clears all stored statuses (useful for testing)
 */
export function clearAllStatuses() {
  saveStatusStore({});
}

/**
 * Gets the count of sites being tracked
 * @returns {number} - Number of sites in the store
 */
export function getSiteCount() {
  const store = loadStatusStore();
  return Object.keys(store).length;
}