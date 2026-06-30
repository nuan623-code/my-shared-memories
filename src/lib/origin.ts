import { createIsomorphicFn } from "@tanstack/react-start";

export const getOrigin = createIsomorphicFn()
  .client(() => window.location.origin)
  .server(() => {
    try {
      // Imported lazily so this module stays safe to import on the client.
      const { getRequestHost, getRequestProtocol } = require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");
      const host = getRequestHost();
      const proto = getRequestProtocol();
      if (host) return `${proto || "https"}://${host}`;
    } catch {}
    return "";
  });
