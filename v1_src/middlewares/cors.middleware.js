const cors = require('cors');

function createCorsMiddleware() {
  const raw = process.env.CORS_ORIGINS || '';
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  // Allow wildcard for mobile apps (custom scheme) if needed; be explicit where possible
  const corsOptions = {
    origin: function (origin, callback) {
      // If no origin (curl, server-to-server), allow
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      // allow subdomains or other policies if needed
      return callback(new Error('CORS policy: Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 600,
  };
  return cors(corsOptions);
}

module.exports = createCorsMiddleware;