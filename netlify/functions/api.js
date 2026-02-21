const serverless = require('serverless-http');
const app = require('../../backend/app');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const handler = serverless(app);

exports.handler = async (event, context) => {
  // Handle CORS preflight immediately - before Express
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  try {
    const result = await handler(event, context);
    // Ensure CORS headers on all responses
    const response = result && result.headers ? result : { headers: {}, ...result };
    response.headers = { ...CORS_HEADERS, ...(response.headers || {}) };
    return response;
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
