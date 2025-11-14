// netlify/functions/proxy.js
const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  // Netlify env var (set in Netlify UI) or fallback to your EC2
  const BACKEND = process.env.BACKEND_URL || "http://13.61.14.126:8000";

  // incoming: /.netlify/functions/proxy/api/extract_summary
  const forwardPath = event.path.replace(/^\/\.netlify\/functions\/proxy/, "") || "/";
  const url = `${BACKEND}${forwardPath}${event.rawQueryString ? "?" + event.rawQueryString : ""}`;

  // copy headers but remove host
  const headers = { ...(event.headers || {}) };
  delete headers.host;

  const opts = {
    method: event.httpMethod,
    headers,
    // Netlify gives raw body as string (base64 when isBase64Encoded)
    body: event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body
  };

  try {
    const resp = await fetch(url, opts);
    const array = await resp.arrayBuffer();
    const bodyBase64 = Buffer.from(array).toString("base64");

    return {
      statusCode: resp.status,
      headers: Object.fromEntries(resp.headers),
      body: bodyBase64,
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("proxy error", err);
    return { statusCode: 502, body: "Bad gateway" };
  }
};
