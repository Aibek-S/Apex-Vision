import React, { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./auth-context";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const updatePassword = async (newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            return { error: error ? new Error(error.message) : null };
        } catch (err) {
            return {
                error: err instanceof Error ? err : new Error("Unknown error"),
            };
        }
    };

    const updateEmail = async (newEmail: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail,
            });
            return { error: error ? new Error(error.message) : null };
        } catch (err) {
            return {
                error: err instanceof Error ? err : new Error("Unknown error"),
            };
        }
    };

    const value = {
        user,
        session,
        loading,
        signOut,
        updatePassword,
        updateEmail,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
