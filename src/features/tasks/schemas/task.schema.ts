import { z } from "zod";

const optionalNullableString = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();

    return trimmed.length === 0 ? null : trimmed;
  }, schema.nullable().optional());

const optionalNullableDateTime = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}, z.string().datetime().nullable().optional());

export const TaskScopeSchema = z.enum(["PERSONAL", "TEAM", "SHARED"]);
export const TaskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);
export const TaskPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const CreateTaskFormSchema = z
  .object({
    scope: TaskScopeSchema.default("PERSONAL"),
    teamId: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Task title is required").max(180),
    description: optionalNullableString(z.string().max(5000)),
    priority: TaskPrioritySchema.default("MEDIUM"),
    dueAt: optionalNullableDateTime,
    reminderAt: optionalNullableDateTime,
  })
  .superRefine((value, context) => {
    if (value.scope === "TEAM" && !value.teamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a team before creating a team task.",
        path: ["teamId"],
      });
    }

    if (value.scope === "PERSONAL" && value.teamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Personal tasks cannot include a team.",
        path: ["teamId"],
      });
    }

    if (value.scope === "SHARED") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Shared tasks are not enabled yet.",
        path: ["scope"],
      });
    }
  });

export const UpdateTaskFormSchema = z
  .object({
    title: z.string().trim().min(1, "Task title is required").max(180).optional(),
    description: optionalNullableString(z.string().max(5000)),
    priority: TaskPrioritySchema.optional(),
    dueAt: optionalNullableDateTime,
    reminderAt: optionalNullableDateTime,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Update at least one task field.",
  });

export type CreateTaskFormValues = z.infer<typeof CreateTaskFormSchema>;
export type UpdateTaskFormValues = z.infer<typeof UpdateTaskFormSchema>;
