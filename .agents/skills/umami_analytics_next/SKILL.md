---
name: umami_analytics_next
description: Skill for configuring, troubleshooting, and maintaining the self-hosted Umami Analytics integration behind an Nginx reverse proxy with auth_request.
---

# Umami Analytics Integration Guide

This skill documents the complete setup and troubleshooting steps used to implement self-hosted Umami Analytics for a Next.js application. Follow these guidelines whenever modifying the analytics infrastructure.

## 1. Architecture Overview

- **Service:** Umami runs in a Docker container (`umami:3002`) defined in `docker-compose.prod.yml`.
- **Domain:** It is accessed via a dedicated subdomain (`umami.yourdomain.com`) instead of a subpath.
- **Frontend Tracking:** The Next.js frontend sends tracking data to `umami.yourdomain.com/script.js` and `/api/send`.
- **Security:** The Umami dashboard is hidden behind the main application's authentication system using Nginx's `auth_request`.

## 2. Nginx Configuration Rules

When modifying `nginx/default.conf`, adhere to these critical rules to prevent CORS errors and infinite login loops:

### A. Subdomain vs Subpath
Always use a subdomain (`umami.yourdomain.com`). Using a subpath (e.g., `/umami`) requires setting `BASE_PATH` in Umami, which can cause routing bugs with its internal Next.js API.

### B. Securing the Dashboard (`auth_request`)
The main location block (`location /`) is protected using `auth_request /_auth_admin;`. This ensures nobody can even see the Umami login screen unless they are logged into the main application's admin panel.

### C. Bypassing Auth for Umami API
Umami's frontend makes internal fetch requests to its own backend API (`/api/auth/verify`, `/api/config`). These requests must **not** be intercepted by the main application's `auth_request`. 
- **Rule:** Always keep an explicit `location /api/` block in the Umami server block that proxies directly to Umami without `auth_request`.

```nginx
# Bypaseamos la autenticación principal para todas las llamadas a la API de Umami
location /api/ {
    proxy_pass http://umami:3002/api/;
    proxy_set_header Host $host;
    ...
}
```

### D. Stripping the Authorization Header
Umami uses its own `Authorization: Bearer <token>` for API calls. If `auth_request` forwards this header to the main backend (`backend:3001/admin/verify`), the backend will reject it, causing a 401 error and CORS failures.
- **Rule:** The `/_auth_admin` subrequest block MUST strip the `Authorization` header so the backend only reads its own authentication cookie.

```nginx
location = /_auth_admin {
    internal;
    proxy_pass http://backend:3001/admin/verify;
    proxy_set_header Cookie $http_cookie;
    proxy_set_header Authorization ""; # CRÍTICO
}
```

## 3. Frontend Implementation

### A. Conditional Tracking
We only track public visitors. We **do not** track visits to the `/admin` panel.
- **Rule:** Use a Client Component (`components/umami-analytics.tsx`) that reads `usePathname()` and returns `null` if the path starts with `/admin`.

```tsx
"use client"
import Script from "next/script"
import { usePathname } from "next/navigation"

export function UmamiAnalytics() {
  const pathname = usePathname()
  if (pathname?.startsWith("/admin")) return null
  return <Script src="..." data-website-id="..." strategy="lazyOnload" />
}
```

### B. Injection
Include `<UmamiAnalytics />` in the root `app/layout.tsx`. Do not use raw `<script>` tags for Umami to ensure smooth Next.js navigation tracking.

## 4. Docker Caveats (Troubleshooting)

If Nginx configurations are changed but the container does not reflect them:
- **Do not just restart.** Docker bind mounts for single files (like `default.conf`) are tied to the file's inode. If the file is overwritten via FTP/SCP, the inode changes, and the container continues reading the ghost file.
- **Fix:** You must recreate the container to pick up the new file:
  ```bash
  docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
  ```
