// api/proxy.js
// Simple Vercel serverless proxy that forwards any request under /api/proxy/*
// to the BACKEND_URL (EC2) while preserving method, headers and body.
// This supports JSON + form-data (multipart) and returns binary safely.

import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false, // we want raw body forwarded
    externalResolver: true,
  },
};

function bufferToArrayBuffer(buf) {
  // Node Buffer -> ArrayBuffer
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export default async function handler(req, res) {
  try {
    const BACKEND = process.env.BACKEND_URL || "http://13.61.14.126:8000";
    // Requested path like /api/proxy/api/study_material -> forward /api/study_material
    const forwardPath = req.url.replace(/^\/api\/proxy/, "") || "/";
    const url = `${BACKEND}${forwardPath}${req.url.includes("?") ? "" : ""}${req.url.split("?")[1] ? "?" + req.url.split("?")[1] : ""}`;

    // copy headers, remove host
    const headers = { ...req.headers };
    delete headers.host;

    // read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyBuffer = Buffer.concat(chunks.length ? chunks : [Buffer.from("")]);

    const fetchOpts = {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : bodyBuffer,
      redirect: "manual",
    };

    const upstream = await fetch(url, fetchOpts);

    // stream response back to client
    res.status(upstream.status);
    upstream.headers.forEach((val, key) => res.setHeader(key, val));

    const upstreamArrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(upstreamArrayBuffer));
  } catch (err) {
    console.error("proxy error:", err);
    res.status(502).send("Bad gateway");
  }
}
