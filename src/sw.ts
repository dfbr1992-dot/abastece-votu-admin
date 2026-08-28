/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

// Recebe os pushes disparados pela Edge Function notify-admin-event quando
// um usuário cria conta ou vira assinante Pro (ver src/routes/notificacoes.tsx
// e supabase/functions/notify-admin-event). O plugin VitePWA (generateSW)
// não gera handler de push por padrão — por isso este service worker
// customizado, injetado via strategies: 'injectManifest' (ver vite.config.ts).
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  let data: { notification?: { title?: string; body?: string }; data?: { url?: string } };
  try {
    data = event.data.json();
  } catch {
    return;
  }
  const title = data.notification?.title || "Abastece ADM";
  const options: NotificationOptions = {
    body: data.notification?.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.data?.url || "/notificacoes" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});
