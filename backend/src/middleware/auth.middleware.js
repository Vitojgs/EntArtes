import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const normalizeRole = (role) => {
  if (!role) return null;
  const upperRole = role.toUpperCase();
  return upperRole;
};

export const hasRole = (userRole, ...allowedRoles) => {
  const normalizeUserRole = (r) => {
    if (!r) return null;
    return r.toUpperCase();
  };

  const userRoles = Array.isArray(userRole) 
    ? userRole.map(normalizeUserRole)
    : [normalizeUserRole(userRole)];

  return allowedRoles.some(allowed => 
    userRoles.includes(normalizeRole(allowed))
  );
};

const normalizeRoles = (value) => {
  if (!value) return [];

  let roles = value;
  if (typeof roles === 'string' && roles.startsWith('[')) {
    try {
      roles = JSON.parse(roles);
    } catch (_) {
      roles = [roles];
    }
  }

  if (!Array.isArray(roles)) roles = [roles];

  return roles
    .map((role) => (role || '').toString().trim().toUpperCase())
    .filter(Boolean);
};

export async function verifyToken(req, reply) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({ error: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.utilizador.findUnique({
      where: { iduser: decoded.id },
      select: { estado: true, tokenVersion: true, role: true },
    });

    if (!user) {
      return reply.status(401).send({ error: "Utilizador não encontrado" });
    }

    if (user.estado === false) {
      return reply.status(401).send({ error: "Utilizador desativado" });
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return reply.status(401).send({ error: "Token expirado — a sua role ou estado foi alterado" });
    }

    const normalizedRoles = normalizeRoles(decoded.role);
    const availableRoles = normalizeRoles(decoded.availableRoles || decoded.role);

    req.user = { 
      ...decoded, 
      role: decoded.role,
      normalizedRoles,
      availableRoles,
    };

    const activeRoleHeader = req.headers['x-active-role'];
    const activeRoleHeaderValue = Array.isArray(activeRoleHeader)
      ? activeRoleHeader[0]
      : activeRoleHeader;
    if (activeRoleHeaderValue && typeof activeRoleHeaderValue === 'string') {
      const activeRole = activeRoleHeaderValue.trim().toUpperCase();
      if (!availableRoles.includes(activeRole)) {
        return reply.status(403).send({ error: "Role ativa inválida" });
      }
      req.user.role = activeRole;
      req.user.normalizedRoles = [activeRole];
    }

  } catch (error) {
    return reply.status(401).send({ error: "Token inválido" });
  }
}
