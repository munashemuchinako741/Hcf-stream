const compression = require('compression');

// Compression middleware for response optimization
const compressionMiddleware = compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Use compression filter function
    return compression.filter(req, res);
  }
});

module.exports = compressionMiddleware;
