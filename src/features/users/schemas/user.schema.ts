import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(z.string().url().max(2048).nullable());

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value));

export const updateCurrentUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value.length === 0 ? null : value))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, or underscores")
        .min(3)
        .max(40)
        .nullable(),
    ),
  bio: optionalText(500),
  timezone: optionalText(64),
  headline: optionalText(160),
  location: optionalText(120),
  websiteUrl: optionalUrl,
  company: optionalText(160),
  phoneNumber: optionalText(32),
  locale: optionalText(32),
});

export type UpdateCurrentUserFormValues = z.infer<
  typeof updateCurrentUserSchema
>;
