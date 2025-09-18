const getUserId = (req) => req.header('X-User-Id') || process.env.DEFAULT_USER_ID || 'default-user';

export { getUserId };
