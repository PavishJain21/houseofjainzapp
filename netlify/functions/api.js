const serverless = require('serverless-http');
const app = require('../../backend/app');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function getCorsHeaders(event) {
  // Reflect request Origin when present (fixes some CORS issues with proxies/tunnels)
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = { ...CORS_HEADERS };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

const handler = serverless(app, {
  basePath: '/.netlify/functions/api',
});

exports.handler = async (event, context) => {
  const corsHeaders = getCorsHeaders(event);

  // Handle CORS preflight immediately - before Express (must return 200 for some proxies)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const result = await handler(event, context);
    // Ensure CORS headers on all responses
    const response = result && result.headers ? result : { headers: {}, ...result };
    response.headers = { ...corsHeaders, ...(response.headers || {}) };
    return response;
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
