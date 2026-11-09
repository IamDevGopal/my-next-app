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

const isValidTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const canonicalizeTimeZone = (value: string): string =>
  new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions()
    .timeZone;

const canonicalizeLocale = (value: string): string =>
  Intl.getCanonicalLocales(value)[0] ?? value;

const optionalTimezone = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(
    z
      .string()
      .max(64)
      .nullable()
      .refine((value) => value === null || isValidTimeZone(value), {
        message: "Use a valid IANA timezone",
      })
      .transform((value) =>
        value === null ? null : canonicalizeTimeZone(value),
      ),
  );

const optionalLocale = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .pipe(
    z
      .string()
      .max(32)
      .nullable()
      .refine(
        (value) => {
          if (value === null) {
            return true;
          }

          try {
            return Intl.getCanonicalLocales(value).length === 1;
          } catch {
            return false;
          }
        },
        { message: "Use a valid BCP 47 locale tag" },
      )
      .transform((value) =>
        value === null ? null : canonicalizeLocale(value),
      ),
  );

const isAllowedWebsiteUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
};

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
  timezone: optionalTimezone,
  headline: optionalText(160),
  location: optionalText(120),
  websiteUrl: optionalUrl.pipe(
    z
      .string()
      .url()
      .max(2048)
      .nullable()
      .refine((value) => value === null || isAllowedWebsiteUrl(value), {
        message: "Website URL must use HTTP or HTTPS without credentials",
      }),
  ),
  company: optionalText(160),
  phoneNumber: optionalText(32),
  locale: optionalLocale,
});

export type UpdateCurrentUserFormValues = z.infer<
  typeof updateCurrentUserSchema
>;
