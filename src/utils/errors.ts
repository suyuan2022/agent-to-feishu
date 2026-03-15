export class FeishuApiError extends Error {
  code: number;

  constructor(code: number, msg: string) {
    super(`Feishu API error ${code}: ${msg}`);
    this.code = code;
    this.name = "FeishuApiError";
  }
}

export function formatError(err: unknown): string {
  if (err instanceof FeishuApiError) {
    return `[Feishu ${err.code}] ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
