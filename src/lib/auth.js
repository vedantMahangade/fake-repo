import { findByAccountId } from "../db/users.js";

export function getAccountIdFromRequest(request) {
  const header = request.headers.get("x-account-id");
  if (header) return header;
  return null;
}

export async function getAccountIdFromBody(request) {
  try {
    const body = await request.clone().json();
    return body.accountId ?? null;
  } catch {
    return null;
  }
}

export function requireUser(accountId) {
  if (!accountId) {
    throw new Error("accountId is required");
  }
  const user = findByAccountId(accountId);
  if (!user) {
    throw new Error("Account not found");
  }
  return user;
}

export function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) {
    throw new Error(`Requires role: ${roles.join(" or ")}`);
  }
  return user;
}
