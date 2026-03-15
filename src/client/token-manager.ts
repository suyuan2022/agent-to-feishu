import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir, ensureConfigDir } from "../utils/config.js";

interface TokenCache {
  tenantAccessToken: string;
  expiresAt: number;
}

const CACHE_FILE = join(getConfigDir(), "token-cache.json");
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class TokenManager {
  private appId: string;
  private appSecret: string;
  private domain: string;
  private cache: TokenCache | null = null;

  constructor(appId: string, appSecret: string, domain = "https://open.feishu.cn") {
    this.appId = appId;
    this.appSecret = appSecret;
    this.domain = domain;
    this.loadCache();
  }

  async getToken(): Promise<string> {
    if (this.cache && Date.now() < this.cache.expiresAt - REFRESH_MARGIN_MS) {
      return this.cache.tenantAccessToken;
    }
    return this.refresh();
  }

  private async refresh(): Promise<string> {
    const url = `${this.domain}/open-apis/auth/v3/tenant_access_token/internal`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to get tenant_access_token: HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      code: number;
      msg: string;
      tenant_access_token: string;
      expire: number;
    };

    if (data.code !== 0) {
      throw new Error(`Feishu auth error ${data.code}: ${data.msg}`);
    }

    this.cache = {
      tenantAccessToken: data.tenant_access_token,
      expiresAt: Date.now() + data.expire * 1000,
    };
    this.saveCache();
    return data.tenant_access_token;
  }

  private loadCache(): void {
    try {
      if (existsSync(CACHE_FILE)) {
        this.cache = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
      }
    } catch {
      this.cache = null;
    }
  }

  private saveCache(): void {
    try {
      ensureConfigDir();
      writeFileSync(CACHE_FILE, JSON.stringify(this.cache), "utf-8");
    } catch {
      // non-critical
    }
  }
}
