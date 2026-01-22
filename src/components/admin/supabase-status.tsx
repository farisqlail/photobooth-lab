"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type Status = "idle" | "connected" | "missing" | "error";

export default function SupabaseStatus() {
  const enabled = useMemo(
    () =>
      Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );
  const [status, setStatus] = useState<Status>(enabled ? "idle" : "missing");
  const [detail, setDetail] = useState<string>(
    enabled
      ? ""
      : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getSession()
      .then(() => {
        setStatus("connected");
        setDetail("Auth client is ready for sessions and storage.");
      })
      .catch((error) => {
        setStatus("error");
        setDetail(error.message);
      });
  }, [enabled]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span className="text-foreground">
          {status === "connected" && "Connected"}
          {status === "missing" && "Missing environment variables"}
          {status === "error" && "Connection error"}
          {status === "idle" && "Checking connection"}
        </span>
        <span>{detail}</span>
      </CardContent>
    </Card>
  );
}
