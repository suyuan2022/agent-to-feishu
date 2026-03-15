export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printSuccess(msg: string): void {
  console.log(`✓ ${msg}`);
}

export function printError(msg: string): void {
  console.error(`✗ ${msg}`);
}
