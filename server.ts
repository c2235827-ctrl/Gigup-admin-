import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for proxying POST/PUT/PATCH requests
  app.use(express.json());

  // API proxy route
  app.all('/api-proxy/*', async (req, res) => {
    const targetPath = req.params[0] || '';
    const queryString = new URL(req.url, `http://${req.headers.host || 'localhost'}`).search;
    const targetUrl = `https://ndcztauwnkycknrbbmix.supabase.co/functions/v1/${targetPath}${queryString}`;

    try {
      const headers: Record<string, string> = {};
      
      // Forward authentication and content-type headers
      if (req.headers['x-admin-secret']) {
        headers['x-admin-secret'] = req.headers['x-admin-secret'] as string;
      }
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      // Forward request body for writing operations
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      
      res.status(response.status);

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }

      const bodyText = await response.text();
      res.send(bodyText);
    } catch (error: any) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Proxy failed', details: error.message });
    }
  });

  // Vite middleware setup for development, static assets serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
