export const neonConfig = {
  authUrl: process.env.REACT_APP_NEON_AUTH_URL || "",
  dataApiUrl: process.env.REACT_APP_NEON_DATA_API_URL || "",
};

export const neonConfigured = Boolean(neonConfig.authUrl && neonConfig.dataApiUrl);
