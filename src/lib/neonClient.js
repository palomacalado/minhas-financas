import { createClient } from "@neondatabase/neon-js";

const authUrl = process.env.REACT_APP_NEON_AUTH_URL;
const dataApiUrl = process.env.REACT_APP_NEON_DATA_API_URL;

export const neonClient = authUrl && dataApiUrl
  ? createClient({
      auth: { url: authUrl },
      dataApi: { url: dataApiUrl },
    })
  : null;

export const neonConfigured = Boolean(neonClient);
