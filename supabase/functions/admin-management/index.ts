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
      const { new_password, user_id } = params;
      const targetId = user_id || user.id;
      if (!new_password || new_password.length < 6) {
        return new Response(JSON.stringify({ error: "Password minimal 6 karakter" }), { status: 400, headers: corsHeaders });
      }
      const { error } = await adminClient.auth.admin.updateUserById(targetId, { password: new_password });
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

    if (action === "list_admins") {
      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (rolesError) return new Response(JSON.stringify({ error: rolesError.message }), { status: 400, headers: corsHeaders });

      const admins = [];
      for (const role of roles || []) {
        const { data: { user: adminUser } } = await adminClient.auth.admin.getUserById(role.user_id);
        if (adminUser) {
          admins.push({
            id: adminUser.id,
            email: adminUser.email,
            created_at: adminUser.created_at,
            last_sign_in_at: adminUser.last_sign_in_at,
          });
        }
      }
      return new Response(JSON.stringify({ admins }), { headers: corsHeaders });
    }

    if (action === "delete_admin") {
      const { user_id: targetId } = params;
      if (!targetId) return new Response(JSON.stringify({ error: "user_id wajib diisi" }), { status: 400, headers: corsHeaders });
      if (targetId === user.id) return new Response(JSON.stringify({ error: "Tidak bisa menghapus akun sendiri" }), { status: 400, headers: corsHeaders });

      await adminClient.from("user_roles").delete().eq("user_id", targetId).eq("role", "admin");
      const { error } = await adminClient.auth.admin.deleteUser(targetId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
