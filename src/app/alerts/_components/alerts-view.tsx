"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { urlBase64ToUint8Array } from "@/lib/push-client";

interface AlertItem {
  id: number;
  title: string;
  body: string;
  urgent: boolean;
  read: boolean;
  createdAt: string;
}

type PhoneAlertState = "checking" | "unsupported" | "blocked" | "off" | "on";

const pollMilliseconds = 10000;
const jsonHeaders = { "Content-Type": "application/json" };

const phoneAlertMessages: Record<PhoneAlertState, string> = {
  checking: "Checking phone alerts",
  unsupported: "This browser cannot send phone alerts.",
  blocked: "Notifications are blocked. Allow them in this browser's site settings.",
  off: "Phone alerts are off. Turn them on to get alerts even when this page is closed.",
  on: "Phone alerts are on.",
};

function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

function formatTime(sqliteTime: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(`${sqliteTime.replace(" ", "T")}Z`));
}

export function AlertsView() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [phoneAlerts, setPhoneAlerts] = useState<PhoneAlertState>("checking");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((response) => response.json() as Promise<{ notifications: AlertItem[] }>)
      .then((data) => setAlerts(data.notifications))
      .catch(() => setError("Alerts could not load. Check that the server is running."));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, pollMilliseconds);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    const check: Promise<PhoneAlertState> = !pushSupported()
      ? Promise.resolve("unsupported")
      : Notification.permission === "denied"
        ? Promise.resolve("blocked")
        : currentSubscription().then((subscription) => (subscription ? "on" : "off"));
    check.then((state) => {
      if (active) {
        setPhoneAlerts(state);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function readAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ action: "read-all" }),
    });
    load();
  }

  async function turnOnPhoneAlerts() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPhoneAlerts(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const keyResponse = await fetch("/api/push/key");
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!saved.ok) {
        throw new Error("The subscription could not be saved.");
      }
      setPhoneAlerts("on");
    } catch {
      setError("Phone alerts could not be turned on. Check that this browser allows notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOffPhoneAlerts() {
    setBusy(true);
    setError(null);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: jsonHeaders,
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPhoneAlerts("off");
    } catch {
      setError("Phone alerts could not be turned off.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestAlert() {
    setError(null);
    const response = await fetch("/api/push/test", { method: "POST" });
    if (!response.ok) {
      setError("The test alert could not be sent.");
      return;
    }
    load();
  }

  const unread = alerts.filter((alert) => !alert.read).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 md:px-8">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-5">
        <p className="max-w-md text-sm text-muted">{phoneAlertMessages[phoneAlerts]}</p>
        <div className="flex flex-wrap gap-2">
          {phoneAlerts === "off" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void turnOnPhoneAlerts()}
              className="flex h-10 items-center gap-2 rounded-xl bg-doom px-4 text-sm font-semibold text-canvas disabled:opacity-40"
            >
              <Icon name="notifications_active" size={18} />
              Turn on phone alerts
            </button>
          )}
          {phoneAlerts === "on" && (
            <>
              <button
                type="button"
                onClick={() => void sendTestAlert()}
                className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-raised"
              >
                Send test alert
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void turnOffPhoneAlerts()}
                className="h-10 rounded-xl px-4 text-sm text-muted hover:bg-raised hover:text-danger disabled:opacity-40"
              >
                Turn off
              </button>
            </>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{unread === 0 ? "You have read everything." : `${unread} unread`}</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void readAll()}
            className="h-10 rounded-xl border border-line px-4 text-sm font-medium hover:bg-raised"
          >
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {alerts.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel p-6 text-sm text-muted">
          No alerts yet. Results from your routines and urgent alerts from your Doombots appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`flex flex-col gap-3 rounded-2xl border bg-panel p-5 ${
                alert.urgent ? "border-danger/50" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span className="flex items-center gap-2">
                  {!alert.read && <span aria-label="Unread" className="h-2 w-2 rounded-full bg-doom" />}
                  {alert.urgent && <span className="font-semibold text-danger">Urgent</span>}
                </span>
                <span>{formatTime(alert.createdAt)}</span>
              </div>
              <p className="font-medium">{alert.title}</p>
              {alert.body && <Markdown text={alert.body} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
