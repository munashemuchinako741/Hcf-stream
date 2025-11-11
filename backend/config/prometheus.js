const promMid = require('express-prometheus-middleware');

// Prometheus metrics middleware configuration
const prometheusMiddleware = promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  extraMasks: [/password/], // Mask sensitive data in metrics
  prefix: 'hcf_stream_',
  customLabels: ['method', 'status_code', 'endpoint'],
  transformLabels: (labels, req, res) => {
    // Add custom labels
    labels.endpoint = req.route ? req.route.path : req.path;
    labels.method = req.method;
    labels.status_code = res.statusCode.toString();
  },
});

module.exports = prometheusMiddleware;
