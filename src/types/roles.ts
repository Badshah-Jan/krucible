/** Application roles — stored on users/{uid}.role */
export type UserRole =
  | "user"
  | "business_owner"
  | "premium_business"
  | "moderator"
  | "admin";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  business_owner: 1,
  premium_business: 2,
  moderator: 3,
  admin: 4,
};

export function hasMinimumRole(
  userRole: UserRole | undefined,
  required: UserRole,
): boolean {
  const current = ROLE_HIERARCHY[userRole ?? "user"];
  return current >= ROLE_HIERARCHY[required];
}
