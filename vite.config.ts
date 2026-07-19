import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

// Vite Plugin to proxy IPTV requests (bypasses CORS, Mixed Content, and User-Agent blocking)
function iptvProxyPlugin() {
  return {
    name: 'iptv-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/iptv-proxy', async (req: any, res: any) => {
        try {
          const requestUrl = new URL(req.url, `http://${req.headers.host}`);
          const targetUrl = requestUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
            return;
          }

          // Parse target URL
          const parsedTarget = new URL(targetUrl);
          const protocol = parsedTarget.protocol === 'https:' ? https : http;

          // Set CORS headers for browser access
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          const proxyReq = protocol.request(
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
              res.statusCode = proxyRes.statusCode || 200;
              
              // Forward content-type and other stream headers
              if (proxyRes.headers['content-type']) {
                res.setHeader('Content-Type', proxyRes.headers['content-type']);
              } else {
                res.setHeader('Content-Type', 'video/mp2t');
              }

              if (proxyRes.headers['content-length']) {
                res.setHeader('Content-Length', proxyRes.headers['content-length']);
              }

              // Pipe response stream directly back to client
              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', (err) => {
            console.error('[IPTV Proxy Error]:', err.message);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Failed to fetch upstream IPTV URL', details: err.message }));
          });

          proxyReq.end();
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), iptvProxyPlugin()],
});
