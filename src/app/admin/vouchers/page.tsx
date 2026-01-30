'use client';

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Plus, Copy, Check, Ticket, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Voucher {
  id: string;
  code: string;
  is_used: boolean;
  created_at: string;
  created_by: string;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newVoucher, setNewVoucher] = useState<Voucher | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      const data = await res.json();
      if (res.ok) {
        setVouchers(data);
      } else {
        console.error("Failed to fetch vouchers", data);
      }
    } catch (error) {
      console.error("Error fetching vouchers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created_by: user?.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewVoucher(data);
        setIsDialogOpen(true);
        fetchVouchers();
      } else {
        alert("Failed to generate voucher: " + data.error);
      }
    } catch (error) {
      console.error("Error generating voucher", error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You might want to show a toast here
    alert("Code copied: " + text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Vouchers</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Generate Code
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voucher Generated</DialogTitle>
            <DialogDescription>
              Use this code to validate a cash payment at the booth.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <div className="flex items-center justify-center rounded-md border p-4 text-2xl font-mono font-bold tracking-wider">
                {newVoucher?.code}
              </div>
            </div>
            <Button size="icon" className="px-3" onClick={() => newVoucher && copyToClipboard(newVoucher.code)}>
              <span className="sr-only">Copy</span>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Recent Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left">
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Created At</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No vouchers found. Generate one to get started.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-mono font-bold">{voucher.code}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            voucher.is_used
                              ? "bg-muted text-muted-foreground"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          }`}
                        >
                          {voucher.is_used ? "Used" : "Active"}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(voucher.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                         <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(voucher.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
