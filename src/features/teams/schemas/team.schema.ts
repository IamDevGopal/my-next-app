import { z } from "zod";

const optionalNullableString = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    return trimmed.length === 0 ? null : trimmed;
  }, schema.nullable().optional());

export const TeamMemberRoleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);
export const AssignableTeamMemberRoleSchema = z.enum(["EDITOR", "VIEWER"]);
export const TeamVisibilitySchema = z.enum(["PRIVATE", "INTERNAL", "PUBLIC"]);
export const TeamJoinPolicySchema = z.enum([
  "INVITE_ONLY",
  "REQUEST_ONLY",
  "INVITE_OR_REQUEST",
]);

export const CreateTeamFormSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(120),
  description: optionalNullableString(z.string().max(1200)),
  avatarUrl: optionalNullableString(z.string().url().max(2048)),
  visibility: TeamVisibilitySchema.default("PRIVATE"),
  joinPolicy: TeamJoinPolicySchema.default("INVITE_OR_REQUEST"),
});

export const UpdateTeamFormSchema = CreateTeamFormSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "Update at least one team field.",
  },
);

export const CreateTeamInviteFormSchema = z.object({
  inviteeUserId: z.string().uuid(),
  role: AssignableTeamMemberRoleSchema.default("VIEWER"),
  message: optionalNullableString(z.string().max(500)),
});

export const UpdateTeamMemberFormSchema = z.object({
  role: AssignableTeamMemberRoleSchema,
});

export type CreateTeamFormValues = z.infer<typeof CreateTeamFormSchema>;
export type UpdateTeamFormValues = z.infer<typeof UpdateTeamFormSchema>;
export type CreateTeamInviteFormValues = z.infer<
  typeof CreateTeamInviteFormSchema
>;
export type UpdateTeamMemberFormValues = z.infer<
  typeof UpdateTeamMemberFormSchema
>;
