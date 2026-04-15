import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Критическая ошибка: отсутствуют VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY в .env файле"
    );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
