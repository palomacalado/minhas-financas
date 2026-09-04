import { createClient } from "@neondatabase/neon-js";

const authUrl =
  process.env.REACT_APP_NEON_AUTH_URL ||
  "https://ep-sweet-pond-ae3m06ce.neonauth.c-2.us-east-2.aws.neon.tech/neondb/auth";

const dataApiUrl =
  process.env.REACT_APP_NEON_DATA_API_URL ||
  "https://ep-sweet-pond-ae3m06ce.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1";

export const neonClient = createClient({
  auth: { url: authUrl },
  dataApi: { url: dataApiUrl },
});

export const neonConfigured = Boolean(neonClient);
