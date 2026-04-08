import { randomBytes } from "crypto";
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getCookieValue(req: Request, key: string): string | undefined {
  const cookieBag = (req as Request & { cookies?: Record<string, unknown> }).cookies;
  const cookieValue = cookieBag?.[key];
  if (typeof cookieValue === "string") return cookieValue;

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const parsed = parseCookieHeader(cookieHeader);
  const value = parsed[key];
  return typeof value === "string" ? value : undefined;
}

function getRedirectUri() {
  return `${ENV.appUrl.replace(/\/+$/, "")}/api/oauth/callback`;
}

function getMissingOAuthEnv() {
  return [
    !ENV.googleClientId && "GOOGLE_CLIENT_ID",
    !ENV.googleClientSecret && "GOOGLE_CLIENT_SECRET",
    !ENV.appUrl && "APP_URL",
    !ENV.cookieSecret && "JWT_SECRET",
  ].filter(Boolean);
}

function clearOAuthStateCookie(req: Request, res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
  });
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/login", async (req: Request, res: Response) => {
    const missing = getMissingOAuthEnv();
    if (missing.length > 0) {
      res.status(503).json({
        error: "OAuth is not configured for this environment",
        missing,
      });
      return;
    }

    const state = randomBytes(8).toString("hex");

    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PRODUCTION,
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", getRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);

    res.redirect(302, url.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const missing = getMissingOAuthEnv();
    if (missing.length > 0) {
      res.status(503).json({
        error: "OAuth is not configured for this environment",
        missing,
      });
      return;
    }

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      clearOAuthStateCookie(req, res);
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const storedState = getCookieValue(req, OAUTH_STATE_COOKIE);
    clearOAuthStateCookie(req, res);

    if (!storedState || storedState !== state) {
      res.status(400).json({ error: "Invalid OAuth state" });
      return;
    }

    try {
      const tokenBody = new URLSearchParams({
        code,
        client_id: ENV.googleClientId,
        client_secret: ENV.googleClientSecret,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      });

      const { data: tokenResponse } = await axios.post<GoogleTokenResponse>(
        GOOGLE_TOKEN_URL,
        tokenBody.toString(),
        {
          headers: { "content-type": "application/x-www-form-urlencoded" },
          timeout: AXIOS_TIMEOUT_MS,
        }
      );

      const { data: userInfo } = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
        timeout: AXIOS_TIMEOUT_MS,
      });

      if (!userInfo.sub) {
        res.status(400).json({ error: "Google user info missing sub" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.sub,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.sub, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[OAuth] Callback failed:", errMsg, error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    clearOAuthStateCookie(req, res);
    res.redirect(302, "/");
  });
}
