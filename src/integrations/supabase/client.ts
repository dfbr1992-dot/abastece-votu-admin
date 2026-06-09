import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Função para limpar variáveis de ambiente (remove aspas e espaços)
const cleanEnvVar = (value: string | undefined) => {
  if (!value) return '';
  return value.replace(/['"]+/g, '').trim();
};

const SUPABASE_URL = cleanEnvVar(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_PUBLISHABLE_KEY = cleanEnvVar(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('[Supabase] Variáveis de ambiente ausentes ou mal formatadas.');
}

// Exportação direta do cliente para evitar problemas de proxy ou lazy loading em ambientes de rede instáveis
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'abastece-votu-admin' }
  }
});
