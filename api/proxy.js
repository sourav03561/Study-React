import fetch from 'node-fetch';

export default async function handler(req, res) {
  const BACKEND = process.env.BACKEND_URL || 'http://13.61.14.126:8000';
  const forwardPath = req.url.replace(/^\/api\/proxy/, '') || '/';
  const url = `${BACKEND}${forwardPath}${req.url.includes('?') ? '' : ''}`;

  const headers = { ...req.headers };
  delete headers.host;

  try {
    const resp = await fetch(`${BACKEND}${forwardPath}${req.url.includes('?') ? '' : ''}`, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });
    const buffer = await resp.arrayBuffer();
    res.status(resp.status);
    resp.headers.forEach((v, k) => res.setHeader(k, v));
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(502).send('Bad gateway');
  }
}
