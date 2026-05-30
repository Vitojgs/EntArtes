export function authorizeRole(...roles) {
  const allowed = roles.map(r => r.toUpperCase());
  return async (req, reply) => {
    const activeRoles = req.user.normalizedRoles || [req.user.role];
    const normalized = activeRoles.map(r => (r || '').toUpperCase());
    const hasPermission = normalized.some(r => allowed.includes(r));
    if (!hasPermission) {
      return reply.status(403).send({
        error: "Acesso negado"
      });
    }
  };
}
