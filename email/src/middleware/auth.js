/**
 * API Key authentication middleware
 */
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required. Provide X-API-Key header.'
    });
  }

  const validApiKey = process.env.EMAIL_SERVICE_API_KEY;
  
  if (apiKey !== validApiKey) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

module.exports = { authMiddleware };
