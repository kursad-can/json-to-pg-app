import { Pool } from 'pg';

// We will create a pool dynamically based on user credentials
// For now, we can export a function to get a pool
export const getDbPool = (connectionString: string) => {
  return new Pool({
    connectionString,
  });
};

// Helper to execute query with a fresh pool (for one-off operations if needed, 
// but better to keep pool alive if possible. For this app, we might create a pool per request 
// or cache it if we want to support multiple DBs).
// Since this is a local tool, we can probably just instantiate a pool when needed.
