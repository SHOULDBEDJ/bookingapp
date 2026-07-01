import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timed out. Please check your internet or Supabase status.")), 15000)
    );

    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);
      
      const { data, error: authError } = result as any;

      if (authError) throw authError;
      setSession(data.session);
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });

    refresh();

    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { session, loading, error, refresh };
}

export const SHARED_EMAIL = "mykfamily@shamiyana.app";
export const SHARED_PASSWORD = "mykfamily";
export const APP_USERNAME = "mykfamily";
