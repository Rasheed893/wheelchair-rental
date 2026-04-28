export class MissingEnvError extends Error {
  constructor(public readonly key: string) {
    super(`Missing required environment variable: ${key}`);
    this.name = "MissingEnvError";
  }
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new MissingEnvError(key);
  }

  return value;
}

export function getOptionalEnv(key: string, fallback = ""): string {
  return process.env[key]?.trim() || fallback;
}
