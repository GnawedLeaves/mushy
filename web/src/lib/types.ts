import type { Database } from "@/lib/supabase/database.types";

export type SaveRow = Database["public"]["Tables"]["saves"]["Row"];
export type BoardRow = Database["public"]["Tables"]["boards"]["Row"];

export interface SaveWithUrl extends SaveRow {
  mediaUrl: string | null;
}

export interface BoardSummary {
  id: string;
  title: string;
}
