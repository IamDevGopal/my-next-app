/**
 * Single source of truth for the user-platform global role.
 *
 * Currently the user platform has exactly one global role (`USER`). Team
 * authority comes from `TeamMember.role` (OWNER/EDITOR/VIEWER), which is
 * a separate enum and lives in features/teams.
 *
 * Admin-platform roles (SUPER_ADMIN / MANAGER) will NEVER appear in this
 * type — they belong to a separate identity domain. See
 * docs/Memory/rbac_identity_split.md.
 */
export type UserRole = "USER";
