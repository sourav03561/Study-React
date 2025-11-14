// api/proxy.js
import fetch from "node-fetch";

export const config = { api: { bodyParser: false, externalResolver: true } };

export default async function handler(req, res) {
  console.log("PROXY HIT:", req.method, req.url);
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    return res.status(200).end();
  }

  const BACKEND = process.env.BACKEND_URL || "http://13.61.14.126:8000";
  const forwardPath = req.url.replace(/^\/api\/proxy/, "") || "/";
  const qs = req.url.includes("?") ? ("?" + req.url.split("?")[1]) : "";
  const url = `${BACKEND}${forwardPath}${qs}`;

  // collect raw body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: ["GET","HEAD"].includes(req.method) ? undefined : body,
      redirect: "manual"
    });

    const array = await upstream.arrayBuffer();
    upstream.headers.forEach((v,k) => res.setHeader(k, v));
    res.status(upstream.status).send(Buffer.from(array));
  } catch (err) {
    console.error("proxy error", err);
    res.status(502).send("Bad gateway");
  }
}
