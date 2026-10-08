const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

const authorizeRole = (requiredRole = 'moderator') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      // Check role from user metadata or profiles query
      let userRole = req.user.user_metadata?.role || req.user.app_metadata?.role;

      if (!userRole && req.supabase) {
        const { data: profile } = await req.supabase
          .from('profiles')
          .select('role')
          .eq('id', req.user.id)
          .maybeSingle();

        if (profile && profile.role) {
          userRole = profile.role;
        }
      }

      userRole = userRole || 'student';

      if (userRole !== requiredRole) {
        throw new ForbiddenError(`Access denied. Requires '${requiredRole}' role.`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  authorizeRole
};
