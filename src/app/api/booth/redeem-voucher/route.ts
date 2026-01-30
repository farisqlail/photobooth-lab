import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Atomic update: Try to mark as used ONLY if currently unused
    // This prevents race conditions where multiple users try to use the same code simultaneously
    const { data, error } = await supabase
      .from('payment_vouchers')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('code', code)
      .eq('is_used', false) // Critical: ensures we only update if it's currently false
      .select()
      .maybeSingle();

    if (error) {
      console.error("Voucher redemption error:", error);
      return NextResponse.json({ error: 'System error' }, { status: 500 });
    }

    // If no data returned, it means the update failed (condition not met)
    // Either code doesn't exist OR it's already used
    if (!data) {
       // Check if code exists to give specific error message
       const { data: existing } = await supabase
        .from('payment_vouchers')
        .select('is_used')
        .eq('code', code)
        .single();
        
       if (!existing) {
           return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
       } else {
           return NextResponse.json({ error: 'Code already used' }, { status: 400 });
       }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
