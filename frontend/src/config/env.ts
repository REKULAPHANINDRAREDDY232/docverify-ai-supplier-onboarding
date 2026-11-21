import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_NAME: z.string().min(1).default('DocVerify AI'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid frontend environment configuration:\n${details}`);
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL,
  appName: parsed.data.VITE_APP_NAME,
};
