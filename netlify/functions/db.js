// Database helper for Netlify Functions
// Connects to Neon Postgres using environment variables

const { neon } = require('@neondatabase/serverless');

let sqlClient = null;

function getDb() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    sqlClient = neon(databaseUrl);
  }
  
  return sqlClient;
}

module.exports = { getDb };
