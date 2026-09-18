// These two routes authenticate via a bearer token the caller must attach
// explicitly (see verifyExtensionToken.ts) -- there's no ambient browser
// credential (cookie/session) involved, so an open CORS policy here can't
// be leveraged for CSRF the way it could on a cookie-authenticated route.
// That's what makes `*` safe: the token itself is the only thing that
// grants access, and it never travels automatically.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
