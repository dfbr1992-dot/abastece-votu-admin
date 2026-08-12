import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nome: string | null;
  is_premium: boolean;
  is_admin: boolean;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoadingAuth(false);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const user = session?.user ?? null;

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) return null;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  const displayName = getDisplayName(user, profile);
  const isAdmin = !!profile?.is_admin;
  const isAuthenticated = !!user;

  return {
    session,
    user,
    profile,
    isAdmin,
    isAuthenticated,
    loading: loadingAuth || (!!user && loadingProfile),
    displayName,
    initials: getInitials(displayName),
    signOut: async () => {
      await supabase.auth.signOut();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  };
}

function getDisplayName(user: User | null, profile: any): string {
  if (profile?.full_name) return profile.full_name;
  if (profile?.nome) return profile.nome;
  if (!user) return "";
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name || meta?.name || user.email?.split("@")[0] || "Usuário";
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || name[0].toUpperCase();
}
