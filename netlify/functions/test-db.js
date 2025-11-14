// Netlify Function: Database Test
// Quick health check for database connectivity

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString(),
      note: 'Database not yet configured. Add Netlify Postgres to enable full functionality.'
    })
  };
};
