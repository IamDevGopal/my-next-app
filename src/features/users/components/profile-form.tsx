"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormMessage } from "@/features/auth/components/form-message";
import { AvatarUploadControl } from "@/features/media/components/avatar-upload-control";
import { getErrorMessage } from "@/lib/http/get-error-message";
import {
  removeCurrentUserAvatar,
  updateCurrentUser,
  updateCurrentUserAvatar,
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
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInputValues, unknown, UpdateCurrentUserFormValues>({
    resolver: zodResolver(updateCurrentUserSchema),
    defaultValues: getProfileDefaultValues(user),
  });

  useEffect(() => {
    reset(getProfileDefaultValues(user));
  }, [reset, user]);

  async function onSubmit(values: UpdateCurrentUserFormValues) {
    setFormMessage(null);

    try {
      const response = await updateCurrentUser(accessToken, values);
      onUserUpdated(response.data.user);
      setFormMessage(response.message || "Profile updated.");
    } catch (error) {
      setFormMessage(getErrorMessage(error));
    }
  }

  async function onAvatarUpload(file: File) {
    setAvatarMessage(null);
    setIsAvatarSaving(true);

    try {
      const response = await updateCurrentUserAvatar(accessToken, file);
      onUserUpdated(response.data.user);
      setAvatarMessage(response.message || "Avatar updated.");
    } catch (error) {
      setAvatarMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsAvatarSaving(false);
    }
  }

  async function onAvatarRemove() {
    setAvatarMessage(null);
    setIsAvatarSaving(true);

    try {
      const response = await removeCurrentUserAvatar(accessToken);
      onUserUpdated(response.data.user);
      setAvatarMessage(response.message || "Avatar removed.");
    } catch (error) {
      setAvatarMessage(getErrorMessage(error));
    } finally {
      setIsAvatarSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <AvatarUploadControl
        avatarUrl={user.avatarUrl}
        disabled={isAvatarSaving}
        message={avatarMessage}
        name={user.name}
        onRemove={onAvatarRemove}
        onUpload={onAvatarUpload}
      />

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
        <label className="text-sm font-semibold text-slate-800" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          className="min-h-24 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100"
          placeholder="Short professional intro"
          {...register("bio")}
        />
        {errors.bio?.message ? (
          <p className="text-xs font-medium text-rose-600">
            {errors.bio.message}
          </p>
        ) : null}
      </div>

      {formMessage ? <FormMessage tone="neutral">{formMessage}</FormMessage> : null}

      <div className="flex justify-end">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <Save className="size-4" />
          {isSubmitting ? "Saving" : "Save"}
        </button>
      </div>
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

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-800" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-100"
        {...props}
      />
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
