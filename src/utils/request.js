const getUserId = (req) => req.header('X-User-Id') || 'default-user';

export { getUserId };
