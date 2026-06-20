import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface PayoutRow {
  id: string;
  wallet: string;
  lamports: string;
  status: string;
  signature: string | null;
  created_at: string;
}

/**
 * Live feed of real (on-chain) payouts, newest first. Reads the `payouts` table
 * via the anon Supabase client (read-only RLS) and refetches on any change so
 * the feed updates the moment a winner is paid. Only rows with a signature are
 * returned — i.e. actual transactions you can verify on Solscan.
 */
export function usePayouts(limit = 30): PayoutRow[] {
  const [rows, setRows] = useState<PayoutRow[]>([]);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;

    const load = async () => {
      const { data } = await supabase!
        .from("payouts")
        .select("id,wallet,lamports,status,signature,created_at")
        .not("signature", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (alive && data) setRows(data as PayoutRow[]);
    };

    void load();

    const channel = supabase
      .channel("payout-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payouts" },
        () => void load(),
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase?.removeChannel(channel);
    };
  }, [limit]);

  return rows;
}
