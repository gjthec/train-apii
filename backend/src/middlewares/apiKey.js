const apiKeyMiddleware = (req, res, next) => {
  const requiredKey = process.env.API_KEY;
  if (!requiredKey) return next();

  const key = req.header('X-API-Key');
  if (key !== requiredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

export { apiKeyMiddleware };
