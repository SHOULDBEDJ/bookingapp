import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_EMAIL, SHARED_PASSWORD, APP_USERNAME } from "@/hooks/use-auth";
import { ensureSharedUser } from "@/lib/auth-functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const ensure = useServerFn(ensureSharedUser);
  const [username, setUsername] = useState(APP_USERNAME);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (username !== APP_USERNAME || password !== SHARED_PASSWORD) {
        toast.error("Invalid credentials");
        return;
      }
      // Ensure shared user exists (first time use)
      await ensure({}).catch(() => {});
      const { error } = await supabase.auth.signInWithPassword({ email: SHARED_EMAIL, password: SHARED_PASSWORD });
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/dashboard" });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-elevated p-8 sm:p-10 border border-border">
          <div className="flex flex-col items-center text-center mb-6">
            <img src={logo} alt="Shiva Shakti Shamiyana" className="w-24 h-24 mb-4 animate-float" width={96} height={96} />
            <h1 className="text-2xl font-bold text-gradient">Shiva Shakti Shamiyana</h1>
            <p className="text-muted-foreground text-sm mt-1">Booking Management System</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground shadow-brand hover:opacity-95 h-11">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
            <p className="text-xs text-muted-foreground text-center">Default: mykfamily / mykfamily</p>
          </form>
        </div>
      </div>
    </div>
  );
}
