// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

type ErrorEmitter = {
  on: (event: "error", fn: (err: unknown) => void) => void;
  listenerCount: (event: "error") => number;
};

/** The `ws` library stores the WebSocket it creates for an upgraded socket under Symbol("websocket"). */
function webSocketFor(socket: object): ErrorEmitter | undefined {
  const key = Object.getOwnPropertySymbols(socket).find((s) => s.description === "websocket");
  const ws = key ? (socket as Record<symbol, unknown>)[key] : undefined;
  return ws && typeof (ws as ErrorEmitter).on === "function" ? (ws as ErrorEmitter) : undefined;
}

/**
 * Vite answers `vite-ping` reconnect probes with a WebSocket that has no 'error' listener.
 * When a malformed frame reaches it ("Invalid WebSocket frame: RSV1 must be clear"), Node
 * throws an unhandled 'error' event and the whole dev server exits. Give every WebSocket
 * Vite creates an error listener so a bad frame closes that one socket instead.
 */
function tolerateMalformedHmrWs(): Plugin {
  return {
    name: "tolerate-malformed-hmr-ws",
    configureServer(server) {
      const onError = (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        server.config.logger.warn(`[vite] closed a WebSocket after a malformed frame: ${message}`);
      };
      // Prepended so it runs regardless of listener order; Vite's handler upgrades the socket
      // synchronously, and frames are only parsed on later I/O, so nextTick is early enough.
      server.httpServer?.prependListener("upgrade", (_req, socket) => {
        process.nextTick(() => {
          const ws = webSocketFor(socket);
          if (ws && ws.listenerCount("error") === 0) ws.on("error", onError);
        });
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [tolerateMalformedHmrWs()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
