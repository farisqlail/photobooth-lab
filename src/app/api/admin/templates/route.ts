import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return null;
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getAuthClient = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
};

const ensureAdmin = async () => {
  const authClient = await getAuthClient();
  const adminClient = getAdminClient();
  if (!authClient || !adminClient) {
    return { error: "Supabase environment belum lengkap", status: 500 };
  }
  const { data } = await authClient.auth.getUser();
  if (!data.user) {
    return { error: "Unauthorized", status: 401 };
  }
  const { data: adminData } = await adminClient
    .from("admin_users")
    .select("user_id,email")
    .or(`user_id.eq.${data.user.id},email.eq.${data.user.email ?? ""}`)
    .maybeSingle();
  if (!adminData) {
    return { error: "Forbidden", status: 403 };
  }
  return { adminClient, user: data.user };
};

export async function POST(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File tidak valid" }, { status: 400 });
  }
  const fileName = typeof formData.get("name") === "string" ? formData.get("name") : file.name;
  const filePath = `frames/${crypto.randomUUID()}-${file.name}`;
  const upload = await auth.adminClient.storage
    .from("templates")
    .upload(filePath, file, { contentType: file.type || "image/png", upsert: true });
  if (upload.error) {
    return NextResponse.json({ message: upload.error.message }, { status: 400 });
  }
  const insert = await auth.adminClient.from("templates").insert({
    name: String(fileName || file.name).replace(/\.[^.]+$/, ""),
    file_path: filePath,
  });
  if (insert.error) {
    return NextResponse.json({ message: insert.error.message }, { status: 400 });
  }
  return NextResponse.json({ file_path: filePath });
}

export async function DELETE(request: Request) {
  const auth = await ensureAdmin();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  const body = await request.json();
  const filePath = body?.file_path;
  const id = body?.id;
  if (typeof filePath !== "string" || typeof id !== "string") {
    return NextResponse.json({ message: "Data tidak valid" }, { status: 400 });
  }
  await auth.adminClient.storage.from("templates").remove([filePath]);
  const removed = await auth.adminClient.from("templates").delete().eq("id", id);
  if (removed.error) {
    return NextResponse.json({ message: removed.error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
