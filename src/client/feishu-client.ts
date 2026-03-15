import * as lark from "@larksuiteoapi/node-sdk";
import { TokenManager } from "./token-manager.js";
import type { FeishuConfig } from "../utils/config.js";

export class FeishuClient {
  private sdk: lark.Client;
  private tokenManager: TokenManager;
  private config: FeishuConfig;

  constructor(config: FeishuConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(
      config.appId,
      config.appSecret,
      config.domain
    );
    this.sdk = new lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
      domain: config.domain || "https://open.feishu.cn",
    });
  }

  get im() {
    return this.sdk.im;
  }

  get docx() {
    return this.sdk.docx;
  }

  get drive() {
    return this.sdk.drive;
  }

  get bitable() {
    return this.sdk.bitable;
  }

  get wiki() {
    return this.sdk.wiki;
  }

  get calendar() {
    return this.sdk.calendar;
  }

  get contact() {
    return this.sdk.contact;
  }

  async getToken(): Promise<string> {
    return this.tokenManager.getToken();
  }

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.getToken();
    const domain = this.config.domain || "https://open.feishu.cn";
    const url = `${domain}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Feishu API error: HTTP ${res.status} - ${text}`);
    }

    return res.json() as Promise<T>;
  }
}
