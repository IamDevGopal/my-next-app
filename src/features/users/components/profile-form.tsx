"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormMessage } from "@/features/auth/components/form-message";
import { AvatarUploadControl } from "@/features/media/components/avatar-upload-control";
import { ApiError } from "@/lib/http/api-error";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  getCurrentUser,
  removeCurrentUserAvatar,
  updateCurrentUser,
  updateCurrentUserAvatar,
  UsersRequestTimeoutError,
} from "../api/users.api";
import {
  updateCurrentUserSchema,
  type UpdateCurrentUserFormValues,
} from "../schemas/user.schema";
import type { CurrentUserData } from "../types/user.type";

type ProfileFormInputValues = z.input<typeof updateCurrentUserSchema>;

interface ProfileFormProps {
  accessToken: string;
  user: CurrentUserData;
  onUserUpdated: (user: CurrentUserData) => void;
}

function getProfileDefaultValues(user: CurrentUserData): ProfileFormInputValues {
  return {
    name: user.name,
    username: user.username ?? "",
    bio: user.bio ?? "",
    timezone: user.timezone ?? "",
    headline: user.profile?.headline ?? "",
    location: user.profile?.location ?? "",
    websiteUrl: user.profile?.websiteUrl ?? "",
    company: user.profile?.company ?? "",
    phoneNumber: user.profile?.phoneNumber ?? "",
    locale: user.profile?.locale ?? "",
  };
}

export function ProfileForm({
  accessToken,
  user,
  onUserUpdated,
}: ProfileFormProps) {
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formMessageTone, setFormMessageTone] = useState<
    "neutral" | "success" | "danger"
  >("neutral");
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarMessageTone, setAvatarMessageTone] = useState<
    "neutral" | "success" | "danger"
  >("neutral");
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [profileVersion, setProfileVersion] = useState(user.updatedAt);
  const {
    register,
    reset,
    handleSubmit,
    setError,
    formState: { dirtyFields, errors, isDirty, isSubmitting },
  } = useForm<ProfileFormInputValues, unknown, UpdateCurrentUserFormValues>({
    resolver: zodResolver(updateCurrentUserSchema),
    defaultValues: getProfileDefaultValues(user),
  });

  async function onSubmit(values: UpdateCurrentUserFormValues) {
    if (isAvatarSaving) {
      return;
    }

    setFormMessage(null);
    setFormMessageTone("neutral");
    const changedValues = Object.fromEntries(
      Object.entries(values).filter(([field]) =>
        dirtyFields[field as keyof typeof dirtyFields],
      ),
    ) as Partial<UpdateCurrentUserFormValues>;

    try {
      const response = await updateCurrentUser(accessToken, {
        ...changedValues,
        expectedUpdatedAt: profileVersion,
      });
      reset(getProfileDefaultValues(response.data.user));
      setProfileVersion(response.data.user.updatedAt);
      onUserUpdated(response.data.user);
      setFormMessage(response.message || "Profile updated.");
      setFormMessageTone("success");
    } catch (error) {
      if (error instanceof UsersRequestTimeoutError) {
        setFormMessageTone("danger");
        try {
          const latestResponse = await getCurrentUser(accessToken);
          const latestUser = latestResponse.data.user;
          setProfileVersion(latestUser.updatedAt);
          onUserUpdated(latestUser);
          setFormMessage(
            `${error.message} Current profile loaded; your draft is preserved. If the save completes later, review any conflict before retrying.`,
          );
        } catch (refreshError) {
          setFormMessage(
            `${error.message} Current profile could not be reloaded: ${getErrorMessage(refreshError)}`,
          );
        }
        return;
      }

      if (
        error instanceof ApiError &&
        error.code === "USER_USERNAME_ALREADY_EXISTS"
      ) {
        setError("username", {
          type: "server",
          message: "Username is already taken.",
        });
        return;
      }

      if (error instanceof ApiError && error.code === "USER_PROFILE_CONFLICT") {
        setFormMessageTone("neutral");
        try {
          const latestResponse = await getCurrentUser(accessToken);
          const latestUser = latestResponse.data.user;
          setProfileVersion(latestUser.updatedAt);
          onUserUpdated(latestUser);
          setFormMessage(
            "Profile changed elsewhere. Your draft is preserved; review it and save again.",
          );
        } catch (refreshError) {
          setFormMessage(getErrorMessage(refreshError));
          setFormMessageTone("danger");
        }
        return;
      }

      setFormMessage(getErrorMessage(error));
      setFormMessageTone("danger");
    }
  }

  async function onAvatarUpload(file: File) {
    setAvatarMessage(null);
    setAvatarMessageTone("neutral");
    setIsAvatarSaving(true);

    try {
      const response = await updateCurrentUserAvatar(accessToken, file);
      setProfileVersion(response.data.user.updatedAt);
      onUserUpdated(response.data.user);
      setAvatarMessage(response.message || "Avatar updated.");
      setAvatarMessageTone("success");
    } catch (error) {
      if (error instanceof UsersRequestTimeoutError) {
        setAvatarMessageTone("danger");
        try {
          const latestResponse = await getCurrentUser(accessToken);
          setProfileVersion(latestResponse.data.user.updatedAt);
          onUserUpdated(latestResponse.data.user);
          setAvatarMessage(
            `${error.message} Current avatar loaded; it may still change if the upload finishes later.`,
          );
        } catch (refreshError) {
          setAvatarMessage(
            `${error.message} Current avatar could not be reloaded: ${getErrorMessage(refreshError)}`,
          );
        }
      } else {
        setAvatarMessage(getErrorMessage(error));
        setAvatarMessageTone("danger");
      }
      throw error;
    } finally {
      setIsAvatarSaving(false);
    }
  }

  async function onAvatarRemove() {
    setAvatarMessage(null);
    setAvatarMessageTone("neutral");
    setIsAvatarSaving(true);

    try {
      const response = await removeCurrentUserAvatar(accessToken);
      setProfileVersion(response.data.user.updatedAt);
      onUserUpdated(response.data.user);
      setAvatarMessage(response.message || "Avatar removed.");
      setAvatarMessageTone("success");
    } catch (error) {
      if (error instanceof UsersRequestTimeoutError) {
        setAvatarMessageTone("danger");
        try {
          const latestResponse = await getCurrentUser(accessToken);
          setProfileVersion(latestResponse.data.user.updatedAt);
          onUserUpdated(latestResponse.data.user);
          setAvatarMessage(
            `${error.message} Current avatar loaded; it may still change if removal finishes later.`,
          );
        } catch (refreshError) {
          setAvatarMessage(
            `${error.message} Current avatar could not be reloaded: ${getErrorMessage(refreshError)}`,
          );
        }
      } else {
        setAvatarMessage(getErrorMessage(error));
        setAvatarMessageTone("danger");
      }
    } finally {
      setIsAvatarSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AvatarUploadControl
        avatarUrl={user.avatarUrl}
        busy={isAvatarSaving}
        disabled={isAvatarSaving || isSubmitting}
        message={avatarMessage}
        messageTone={avatarMessageTone}
        name={user.name}
        onRemove={onAvatarRemove}
        onUpload={onAvatarUpload}
      />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <fieldset
          className="min-w-0 space-y-5 border-0 p-0"
          disabled={isSubmitting}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileInput
              error={errors.name?.message}
              label="Name"
              {...register("name")}
            />
            <ProfileInput
              error={errors.username?.message}
              label="Username"
              placeholder="john_doe"
              {...register("username")}
            />
            <ProfileInput
              error={errors.headline?.message}
              label="Headline"
              placeholder="Product engineer"
              {...register("headline")}
            />
            <ProfileInput
              error={errors.company?.message}
              label="Company"
              placeholder="TaskFlow"
              {...register("company")}
            />
            <ProfileInput
              error={errors.location?.message}
              label="Location"
              placeholder="India"
              {...register("location")}
            />
            <ProfileInput
              error={errors.timezone?.message}
              label="Timezone"
              placeholder="Asia/Kolkata"
              {...register("timezone")}
            />
            <ProfileInput
              error={errors.websiteUrl?.message}
              label="Website"
              placeholder="https://example.com"
              {...register("websiteUrl")}
            />
            <ProfileInput
              error={errors.phoneNumber?.message}
              label="Phone"
              placeholder="+919999999999"
              {...register("phoneNumber")}
            />
            <ProfileInput
              error={errors.locale?.message}
              label="Locale"
              placeholder="en-IN"
              {...register("locale")}
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="bio"
            >
              Bio
            </label>
            <textarea
              id="bio"
              aria-describedby={errors.bio?.message ? "bio-error" : undefined}
              aria-invalid={Boolean(errors.bio?.message)}
              className="min-h-24 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100"
              placeholder="Short professional intro"
              {...register("bio")}
            />
            {errors.bio?.message ? (
              <p
                className="text-xs font-medium text-rose-600"
                id="bio-error"
                role="alert"
              >
                {errors.bio.message}
              </p>
            ) : null}
          </div>

          {formMessage ? (
            <FormMessage tone={formMessageTone}>{formMessage}</FormMessage>
          ) : null}

          <div className="flex justify-end">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isAvatarSaving || !isDirty}
              type="submit"
            >
              <Save className="size-4" />
              {isSubmitting ? "Saving" : "Save"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

interface ProfileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

function ProfileInput({ error, label, ...props }: ProfileInputProps) {
  const inputId = props.id ?? (typeof props.name === "string" ? props.name : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-800" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100"
        {...props}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p className="text-xs font-medium text-rose-600" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
