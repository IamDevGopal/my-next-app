"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthSessionVersion } from "@/features/auth/utils/auth-storage";
import {
  getBrowserPushPublicKey,
  getNotificationPreferences,
  listBrowserPushSubscriptions,
  registerBrowserPushSubscription,
  removeBrowserPushSubscription,
  updateNotificationPreferences,
} from "../api/notifications.api";
import type {
  NotificationPreferenceData,
  NotificationType,
  PushSubscriptionData,
} from "../types/notifications.type";

type PreferenceChannel = "inAppEnabled" | "emailEnabled" | "pushEnabled";

const channelLabels: Array<{ key: PreferenceChannel; label: string }> = [
  { key: "inAppEnabled", label: "In-app" },
  { key: "emailEnabled", label: "Email" },
  { key: "pushEnabled", label: "Browser push" },
];

function applicationServerKeyToBuffer(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer as ArrayBuffer;
}

function isBrowserPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function waitForWorker(): Promise<ServiceWorkerRegistration> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Browser service worker activate nahi hua. Refresh karke retry karein.",
              ),
            ),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export function NotificationSettings({
  accessToken,
  onBack,
}: {
  accessToken: string;
  onBack: () => void;
}) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [preferences, setPreferences] = useState<NotificationPreferenceData[]>(
    [],
  );
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionData[]>(
    [],
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferencesReliable, setPreferencesReliable] = useState(false);
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const [isChangingPush, setIsChangingPush] = useState(false);
  const [savingPreference, setSavingPreference] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadSettings() {
      setIsLoading(true);
      setPreferencesReliable(false);
      setError(null);
      try {
        const [preferenceResponse, subscriptionResponse] = await Promise.all([
          getNotificationPreferences(accessToken),
          listBrowserPushSubscriptions(accessToken),
        ]);
        if (!isCurrent) return;
        setPreferences(preferenceResponse.data.preferences);
        setPreferencesReliable(true);
        setSubscriptions(subscriptionResponse.data.subscriptions);
        if (isBrowserPushSupported()) {
          setPermission(Notification.permission);
          const registration =
            await navigator.serviceWorker.getRegistration("/");
          const subscription =
            await registration?.pushManager.getSubscription();
          if (isCurrent) setCurrentEndpoint(subscription?.endpoint ?? null);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Notification settings load nahi hui.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => {
      isCurrent = false;
    };
  }, [accessToken, reloadAttempt]);

  async function savePreference(
    type: NotificationType,
    channel: PreferenceChannel,
    enabled: boolean,
  ) {
    const version = getAuthSessionVersion();
    const current = () =>
      mounted.current && version === getAuthSessionVersion();
    const previous = preferences;
    const key = `${type}:${channel}`;
    setSavingPreference(key);
    setError(null);
    setPreferences((current) =>
      current.map((preference) =>
        preference.type === type
          ? { ...preference, [channel]: enabled }
          : preference,
      ),
    );

    try {
      const response = await updateNotificationPreferences(accessToken, [
        { type, [channel]: enabled },
      ]);
      if (current()) setPreferences(response.data.preferences);
    } catch (saveError) {
      if (!current()) return;
      try {
        const response = await getNotificationPreferences(accessToken);
        if (!current()) return;
        setPreferences(response.data.preferences);
        setPreferencesReliable(true);
      } catch {
        if (!current()) return;
        setPreferences(previous);
        setPreferencesReliable(false);
      }
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Notification preference save nahi hui.",
      );
    } finally {
      if (current()) setSavingPreference(null);
    }
  }

  async function enableThisBrowser() {
    const version = getAuthSessionVersion();
    const current = () =>
      mounted.current && version === getAuthSessionVersion();
    if (!isBrowserPushSupported()) {
      setError(
        "Browser push ke liye supported browser aur secure HTTPS page chahiye.",
      );
      return;
    }

    setIsChangingPush(true);
    setError(null);
    setMessage(null);
    try {
      const result = await Notification.requestPermission();
      if (!current()) return;
      setPermission(result);
      if (result !== "granted") {
        setError(
          result === "denied"
            ? "Browser permission blocked hai. Browser settings me TaskFlow notifications allow karein."
            : "Browser permission allow kiye bina push enable nahi ho sakta.",
        );
        return;
      }

      const { data } = await getBrowserPushPublicKey(accessToken);
      if (!current()) return;
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" },
      );
      await waitForWorker();
      if (!current()) return;
      let existing = await registration.pushManager.getSubscription();
      if (!current()) return;
      const desiredKey = new Uint8Array(
        applicationServerKeyToBuffer(data.publicKey),
      );
      const existingKey = existing?.options.applicationServerKey;
      const keyChanged =
        existingKey &&
        (existingKey.byteLength !== desiredKey.byteLength ||
          new Uint8Array(existingKey).some(
            (byte, index) => byte !== desiredKey[index],
          ));
      if (
        existing &&
        (!subscriptions.some(
          (device) => device.endpoint === existing!.endpoint,
        ) ||
          keyChanged)
      ) {
        if (
          subscriptions.some((device) => device.endpoint === existing!.endpoint)
        )
          await removeBrowserPushSubscription(accessToken, existing.endpoint);
        await existing.unsubscribe();
        existing = null;
      }
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKeyToBuffer(data.publicKey),
        }));
      if (!current()) return;
      const serialized = subscription.toJSON();
      if (
        !serialized.endpoint ||
        !serialized.keys?.p256dh ||
        !serialized.keys.auth
      ) {
        throw new Error("Browser ne valid push subscription return nahi ki.");
      }

      const response = await registerBrowserPushSubscription(accessToken, {
        endpoint: serialized.endpoint,
        keys: {
          p256dh: serialized.keys.p256dh,
          auth: serialized.keys.auth,
        },
      });
      if (!current()) return;
      setSubscriptions(response.data.subscriptions);
      setCurrentEndpoint(subscription.endpoint);
      setMessage("Is browser par push notifications enable ho gayi.");
    } catch (enableError) {
      if (!current()) return;
      setError(
        enableError instanceof Error
          ? enableError.message
          : "Browser push enable nahi ho saka.",
      );
    } finally {
      if (current()) setIsChangingPush(false);
    }
  }

  async function disableThisBrowser() {
    const version = getAuthSessionVersion();
    const current = () =>
      mounted.current && version === getAuthSessionVersion();
    setIsChangingPush(true);
    setError(null);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!current()) return;
      if (!subscription) {
        setMessage("Is browser par active push subscription nahi hai.");
        return;
      }

      let serverConfirmed = true;
      try {
        await removeBrowserPushSubscription(accessToken, subscription.endpoint);
      } catch {
        serverConfirmed = false;
      }
      if (!current()) return;
      await subscription.unsubscribe();
      setCurrentEndpoint(null);
      setSubscriptions((devices) =>
        devices.filter((device) => device.endpoint !== subscription.endpoint),
      );
      setMessage(
        serverConfirmed
          ? "Is browser ke liye push notifications band kar di."
          : "Is browser par push band hai. Server device record ki removal abhi confirm nahi hui.",
      );
    } catch (disableError) {
      if (!current()) return;
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Browser push disable nahi ho saka.",
      );
    } finally {
      if (current()) setIsChangingPush(false);
    }
  }

  async function revokeDevice(endpoint: string) {
    if (endpoint === currentEndpoint) return disableThisBrowser();
    const version = getAuthSessionVersion();
    setIsChangingPush(true);
    setError(null);
    setMessage(null);
    try {
      await removeBrowserPushSubscription(accessToken, endpoint);
      const response = await listBrowserPushSubscriptions(accessToken);
      if (!mounted.current || version !== getAuthSessionVersion()) return;
      setSubscriptions(response.data.subscriptions);
      setMessage("Selected device ki push access revoke ho gayi.");
    } catch (error) {
      if (mounted.current && version === getAuthSessionVersion())
        setError(
          error instanceof Error ? error.message : "Device remove nahi hua.",
        );
    } finally {
      if (mounted.current && version === getAuthSessionVersion())
        setIsChangingPush(false);
    }
  }

  const isSupported = isBrowserPushSupported();
  const hasDeviceSubscription =
    currentEndpoint !== null &&
    subscriptions.some(
      (subscription) => subscription.endpoint === currentEndpoint,
    );

  return (
    <section aria-label="Notification settings" className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button
          aria-label="Back to notifications"
          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <h3 className="text-sm font-semibold text-slate-950">
          Notification settings
        </h3>
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Browser push on this device
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {isSupported
                ? `${subscriptions.length} device subscription${subscriptions.length === 1 ? "" : "s"} on this account. Browser permission: ${permission ?? "unknown"}.`
                : "Browser push ke liye HTTPS aur service worker support wala browser chahiye."}
            </p>
          </div>
          <button
            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={
              !isSupported ||
              isChangingPush ||
              isLoading ||
              (hasDeviceSubscription && !currentEndpoint)
            }
            onClick={() =>
              void (hasDeviceSubscription
                ? disableThisBrowser()
                : enableThisBrowser())
            }
            type="button"
          >
            {isChangingPush
              ? "Updating..."
              : hasDeviceSubscription
                ? "Turn off this browser"
                : "Enable this browser"}
          </button>
        </div>
      </div>

      {error ? (
        <p
          className="mb-3 rounded-md bg-rose-50 p-3 text-xs text-rose-800"
          role="alert"
        >
          {error}{" "}
          <button
            type="button"
            className="font-semibold underline"
            disabled={isLoading || isChangingPush || savingPreference !== null}
            onClick={() => setReloadAttempt((value) => value + 1)}
          >
            Reload settings
          </button>
        </p>
      ) : null}
      {message ? (
        <p
          className="mb-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {subscriptions.length ? (
        <ul aria-label="Registered push devices" className="mb-5 space-y-2">
          {subscriptions.map((device) => (
            <li
              key={device.id}
              className="rounded-md border border-slate-200 p-2 text-xs"
            >
              <p className="break-words text-slate-600">
                {device.endpoint === currentEndpoint
                  ? "This browser"
                  : (device.userAgent?.slice(0, 100) ?? "Browser device")}
              </p>
              <button
                type="button"
                disabled={isLoading || isChangingPush}
                className="mt-1 font-semibold text-rose-700 underline disabled:opacity-50"
                onClick={() => void revokeDevice(device.endpoint)}
              >
                Revoke this device
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[430px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3 font-semibold">Notification type</th>
              {channelLabels.map((channel) => (
                <th
                  className="px-2 py-2 text-center font-semibold"
                  key={channel.key}
                >
                  {channel.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preferences.map((preference) => (
              <tr className="border-b border-slate-100" key={preference.type}>
                <th className="py-2 pr-3 font-medium text-slate-700">
                  {preference.type.replaceAll("_", " ").toLowerCase()}
                </th>
                {channelLabels.map((channel) => {
                  const key = `${preference.type}:${channel.key}`;
                  return (
                    <td className="px-2 py-2 text-center" key={channel.key}>
                      <input
                        aria-label={`${preference.type} ${channel.label}`}
                        checked={preference[channel.key]}
                        disabled={
                          isLoading ||
                          savingPreference !== null ||
                          !preferencesReliable
                        }
                        onChange={(event) =>
                          void savePreference(
                            preference.type,
                            channel.key,
                            event.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                      {savingPreference === key ? (
                        <span className="sr-only">Saving</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
