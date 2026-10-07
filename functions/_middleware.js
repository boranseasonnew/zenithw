import { PAGES_CSP } from "../shared/pages-security.mjs";
import { STATIC_ASSET_PATHS } from "../shared/pages-cache-assets.mjs";

const NO_STORE = "private, no-store, max-age=0";
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);
const DEFAULT_MESSAGE = "Pati ekibimiz sunucuların kablolarını düzeltiyor. Kısa süre sonra yeniden buradayız.";
const MAINTENANCE_ASSET_PATH = "/maintenance";
const CONFIG_ASSET_PATH = "/maintenance-config.json";

function cleanText(value, fallback, maxLength) {
  const normalized = String(value || "").trim();
  return (normalized || fallback).slice(0, maxLength);
}

function maintenanceConfig(env, fileConfig = {}) {
  const rawMode = String(env.MAINTENANCE_MODE || "workflow").trim().toLowerCase();
  const workflowManaged = !ENABLED_VALUES.has(rawMode) && !DISABLED_VALUES.has(rawMode);
  const source = workflowManaged ? fileConfig : env;
  const retryCandidate = Number.parseInt(
    workflowManaged ? source.retryAfter || "900" : source.MAINTENANCE_RETRY_AFTER || "900",
    10,
  );
  const retryAfter = Number.isFinite(retryCandidate)
    ? Math.min(86400, Math.max(60, retryCandidate))
    : 900;

  return {
    active: ENABLED_VALUES.has(rawMode) || (workflowManaged && fileConfig.active === true),
    title: cleanText(
      workflowManaged ? source.title : source.MAINTENANCE_TITLE,
      "Kısa bir pati molası",
      80,
    ),
    message: cleanText(
      workflowManaged ? source.message : source.MAINTENANCE_MESSAGE,
      DEFAULT_MESSAGE,
      240,
    ),
    until: cleanText(workflowManaged ? source.until : source.MAINTENANCE_UNTIL, "", 64),
    retryAfter,
  };
}

async function loadFileConfig(context) {
  try {
    const response = await context.env.ASSETS.fetch(new URL(CONFIG_ASSET_PATH, context.request.url));
    if (!response.ok) return {};
    const config = await response.json();
    return config && typeof config === "object" && !Array.isArray(config) ? config : {};
  } catch (_) {
    return {};
  }
}

function statusResponse(config, method) {
  const body = method === "HEAD" ? null : JSON.stringify(config);
  return new Response(body, {
    status: 200,
    headers: {
      "Cache-Control": NO_STORE,
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Maintenance-Mode": config.active ? "active" : "inactive",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function maintenancePage(context, config, previewOnly = false) {
  const assetUrl = new URL(MAINTENANCE_ASSET_PATH, context.request.url);
  const assetResponse = await context.env.ASSETS.fetch(assetUrl);
  const headers = new Headers(assetResponse.headers);
  const isUnavailable = config.active && !previewOnly;

  headers.set("Cache-Control", NO_STORE);
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  headers.set("Content-Security-Policy", PAGES_CSP);
  headers.set("Content-Language", "tr");
  headers.set("X-Maintenance-Mode", config.active ? "active" : "inactive");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (isUnavailable) {
    headers.set("Retry-After", String(config.retryAfter));
  } else {
    headers.delete("Retry-After");
  }

  return new Response(context.request.method === "HEAD" ? null : assetResponse.body, {
    status: isUnavailable ? 503 : 200,
    statusText: isUnavailable ? "Service Unavailable" : "OK",
    headers,
  });
}

async function pageResponse(context) {
  const response = await context.next();
  const headers = new Headers(response.headers);
  const isHtml = (headers.get("Content-Type") || "").includes("text/html");
  const isPrivate =
    !["GET", "HEAD"].includes(context.request.method) ||
    context.request.headers.has("Authorization") ||
    context.request.headers.has("Cookie") ||
    headers.has("Set-Cookie");

  if (isHtml) headers.set("Content-Security-Policy", PAGES_CSP);
  headers.set("Cache-Control", isPrivate || response.status >= 400 || !isHtml
    ? NO_STORE
    : "public, max-age=0, must-revalidate");
  // Never let a custom zone HTML cache hide the live maintenance decision.
  // Pages still serves the underlying static HTML from its internal asset cache.
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Backstop if a deployment forgets _routes.json. Only known public assets
  // skip the gate; an API path ending in .js/.png never matches this allowlist.
  if (["GET", "HEAD"].includes(context.request.method) && STATIC_ASSET_PATHS.has(url.pathname)) {
    return context.next();
  }
  const config = maintenanceConfig(context.env, await loadFileConfig(context));

  if (url.pathname === "/maintenance-status") {
    if (context.request.method !== "GET" && context.request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: {
        Allow: "GET, HEAD",
        "Cache-Control": NO_STORE,
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
      } });
    }
    return statusResponse(config, context.request.method);
  }

  // Bakım ekranı kapalıyken tasarımın güvenli biçimde önizlenebilmesini sağlar.
  if (url.pathname === "/maintenance" || url.pathname === "/maintenance.html") {
    return maintenancePage(context, config, true);
  }

  // Arama motorları ve alan adı doğrulaması bakım sırasında da bu dosyalara ulaşabilsin.
  if (
    !config.active ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml" ||
    url.pathname === "/status" ||
    url.pathname === "/status.html" ||
    url.pathname.startsWith("/.well-known/")
  ) {
    return pageResponse(context);
  }

  return maintenancePage(context, config);
}

export { maintenanceConfig };
