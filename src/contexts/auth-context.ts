import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
    id: string;
    full_name: string | null;
    role: "museum" | "public" | null;
    is_guest: boolean | null;
    updated_at: string | null;
};

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    profile: Profile | null;
    profileLoading: boolean;
    isMuseumStaff: boolean;
    isGuest: boolean;
    signOut: () => Promise<void>;
    updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
    updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);
