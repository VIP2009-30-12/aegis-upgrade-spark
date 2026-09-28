import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deletes the caller's own account and cloud data. The user id comes from the verified session only. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) {
      console.error("deleteUser failed", error);
      throw new Error("Account deletion failed");
    }
    return { ok: true };
  });
