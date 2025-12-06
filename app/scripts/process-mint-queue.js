#!/usr/bin/env node

/**
 * Simple script to process the mint queue
 * Can be run manually or via cron job
 * 
 * Usage:
 *   node scripts/process-mint-queue.js
 * 
 * Or add to crontab:
 *   * * * * * cd /path/to/app && node scripts/process-mint-queue.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3050';
const ENDPOINT = `${BASE_URL}/api/mint/process`;

function processQueue() {
  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`[${new Date().toISOString()}] Process result:`, result);
          resolve(result);
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.end();
  });
}

// Run if called directly
if (require.main === module) {
  processQueue()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { processQueue };

