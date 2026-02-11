import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password } = await req.json();

  // Create user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Assign admin role
  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userData.user.id,
    role: "admin",
  });

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
    headers: { "Content-Type": "application/json" },
  });
});
