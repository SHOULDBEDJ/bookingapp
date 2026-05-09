// Server functions to bootstrap & sign in the shared family account.
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SHARED_EMAIL = "mykfamily@shamiyana.app";
const SHARED_PASSWORD = "mykfamily";

export const ensureSharedUser = createServerFn({ method: "POST" }).handler(async () => {
  // Check if user already exists by listing
  const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const exists = list?.users?.some((u) => u.email === SHARED_EMAIL);
  if (!exists) {
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: SHARED_EMAIL,
      password: SHARED_PASSWORD,
      email_confirm: true,
    });
    if (createErr) throw createErr;
  }
  return { email: SHARED_EMAIL };
});
