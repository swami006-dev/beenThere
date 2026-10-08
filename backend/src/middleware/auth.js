const { supabase, createUserClient } = require('../db/supabase');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    req.user = user;
    req.token = token;
    const client = createUserClient(token);
    req.supabase = client;
    req.userClient = client;

    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = user;
          req.token = token;
          const client = createUserClient(token);
          req.supabase = client;
          req.userClient = client;
          return next();
        }
      }
    }
    req.user = null;
    req.token = null;
    req.supabase = supabase;
    req.userClient = supabase;
    next();
  } catch (err) {
    req.user = null;
    req.token = null;
    req.supabase = supabase;
    req.userClient = supabase;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
