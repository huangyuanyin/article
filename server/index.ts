import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createApp } from './app.js';
import { SupabaseArticleRepository } from './article-repository.js';
import { createAdminAuthenticator } from './auth.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const staticDirectory = path.resolve(process.cwd(), 'dist');
const app = createApp({
  articleRepository: new SupabaseArticleRepository(supabase),
  authenticateAdmin: createAdminAuthenticator(supabase, config.adminEmails),
  staticDirectory: existsSync(path.join(staticDirectory, 'index.html')) ? staticDirectory : undefined,
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Article API listening on port ${config.port}`);
});
