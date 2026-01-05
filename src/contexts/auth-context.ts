import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
    updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);
