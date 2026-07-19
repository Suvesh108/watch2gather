import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get target URL from query parameter
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const client = parsedTarget.protocol === 'https:' ? https : http;

    const proxyReq = client.request(
      parsedTarget,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'VLC/3.0.0 LibVLC/3.0.0',
          'Accept': '*/*',
          'Connection': 'keep-alive',
        },
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode || 200);

        if (proxyRes.headers['content-type']) {
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
        } else {
          res.setHeader('Content-Type', 'video/mp2t');
        }

        if (proxyRes.headers['content-length']) {
          res.setHeader('Content-Length', proxyRes.headers['content-length']);
        }

        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[IPTV Production Proxy Error]:', err.message);
      res.status(502).json({ error: 'Proxy error connecting to server', details: err.message });
    });

    proxyReq.end();
  } catch (error) {
    res.status(500).json({ error: 'Invalid URL parameter', details: error.message });
  }
}
