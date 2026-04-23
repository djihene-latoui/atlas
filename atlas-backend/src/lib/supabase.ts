import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur — utilise la clé service_role
 */
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
