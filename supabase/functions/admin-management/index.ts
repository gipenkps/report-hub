import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { action, ...params } = await req.json();

    if (action === "change_password") {
      const { new_password } = params;
      if (!new_password || new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password minimal 6 karakter" }), { status: 400, headers: corsHeaders });
      }
      const { error } = await adminClient.auth.admin.updateUserById(user.id, { password: new_password });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "create_admin") {
      const { email, password } = params;
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email dan password wajib diisi" }), { status: 400, headers: corsHeaders });
      }
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });

      const { error: roleError } = await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });
      if (roleError) return new Response(JSON.stringify({ error: roleError.message }), { status: 400, headers: corsHeaders });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
