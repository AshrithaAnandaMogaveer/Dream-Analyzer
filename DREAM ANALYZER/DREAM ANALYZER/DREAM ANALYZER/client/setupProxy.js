const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API routes to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5001',
      changeOrigin: true,
      secure: false,
      timeout: 10000,
      headers: {
        'Connection': 'keep-alive'
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying API request: ${req.method} ${req.url}`);
      },
      onError: (err, req, res) => {
        console.error('Proxy error for', req.url, ':', err.message);
        // Try to provide a helpful error response
        if (err.code === 'ECONNREFUSED') {
          res.status(503).json({
            error: 'Backend server not available',
            message: 'The backend server on localhost:5000 is not responding. Please ensure the server is running.',
            suggestion: 'Run "npm start" in the server directory'
          });
        } else {
          res.status(500).json({
            error: 'Proxy error',
            details: err.message,
            suggestion: 'Check server logs for more details'
          });
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`Proxy response: ${proxyRes.statusCode} for ${req.url}`);
      }
    })
  );

  // Proxy Socket.io requests
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5001',
      changeOrigin: true,
      secure: false,
      ws: true, // Enable WebSocket proxying
      onError: (err, req, res) => {
        console.error('Socket proxy error:', err.message);
      }
    })
  );
};
