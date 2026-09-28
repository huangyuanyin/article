import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_EMAILS: z.string().min(1),
});

export interface ServerConfig {
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  adminEmails: Set<string>;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`服务端配置无效，请检查环境变量：${missing}`);
  }

  const adminEmails = new Set(
    parsed.data.ADMIN_EMAILS.split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (adminEmails.size === 0) {
    throw new Error('服务端配置无效，请至少配置一个 ADMIN_EMAILS');
  }

  return {
    port: parsed.data.PORT,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    adminEmails,
  };
}
