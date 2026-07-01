import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const { session, loading, error, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session && !error) navigate({ to: "/login" });
  }, [loading, session, error, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero text-primary-foreground p-6 text-center">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-white opacity-50" />
          </div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight">Connection Issue</h2>
          <p className="mb-8 text-white/80 leading-relaxed text-balance">
            {error.message || "We couldn't reach the server. This often happens if the database is paused or your internet connection is unstable."}
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => refresh()}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-95 shadow-xl"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => navigate({ to: "/login" })}
              className="text-white/40 text-sm hover:text-white transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero text-primary-foreground">
        <Loader2 className="w-12 h-12 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-card/60 backdrop-blur px-3 sticky top-0 z-30">
            <SidebarTrigger />
            <h2 className="font-semibold text-gradient">Shiva Shakti Shamiyana</h2>
          </header>
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}
