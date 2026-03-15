import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  domain?: string;
  enabledDomains?: string[];
}

const CONFIG_DIR = join(homedir(), ".agent-to-feishu");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): FeishuConfig | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: FeishuConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function requireConfig(): FeishuConfig {
  const config = loadConfig();
  if (!config) {
    console.error(
      "No configuration found. Run `agent-to-feishu setup` first."
    );
    process.exit(1);
  }
  return config;
}
