import React, { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext, type Profile } from "./auth-context";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const isLocalHost =
        typeof window !== "undefined" &&
        ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);

    const fetchProfile = async (currentUser: User) => {
        setProfileLoading(true);

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, role, is_guest, updated_at")
            .eq("id", currentUser.id)
            .maybeSingle();

        if (error) {
            console.error("Error fetching profile:", error);
            setProfile(null);
            setProfileLoading(false);
            return;
        }

        if (data) {
            setProfile(data);
            setProfileLoading(false);
            return;
        }

        // Создаем базовый профиль, если его нет (например, для гостя).
        const fallbackRole =
            currentUser.user_metadata?.role === "museum" ? "museum" : "public";
        const isAnonymous = Boolean(
            (currentUser as { is_anonymous?: boolean }).is_anonymous
        );
        const { data: createdProfile } = await supabase
            .from("profiles")
            .upsert({
                id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name ?? null,
                role: fallbackRole,
                is_guest: Boolean(currentUser.user_metadata?.is_guest) || isAnonymous,
                updated_at: new Date().toISOString(),
            })
            .select("id, full_name, role, is_guest, updated_at")
            .single();

        setProfile(createdProfile ?? null);
        setProfileLoading(false);
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setProfile(null);
                setProfileLoading(false);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setProfile(null);
                setProfileLoading(false);
            }
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

    // Локальный хост получает права сотрудника для удобства разработки.
    const isMuseumStaff = Boolean(
        user && (profile?.role === "museum" || isLocalHost)
    );
    const isGuest = Boolean(profile?.is_guest);

    const value = {
        user,
        session,
        loading,
        profile,
        profileLoading,
        isMuseumStaff,
        isGuest,
        signOut,
        updatePassword,
        updateEmail,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
};
