import { supabase } from "@/integrations/supabase/client";

export interface SavedInstruction {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export async function listSaved(): Promise<SavedInstruction[]> {
  const { data, error } = await supabase
    .from("saved_instructions")
    .select("id,title,content,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function saveInstruction(title: string, content: string) {
  const { error } = await supabase
    .from("saved_instructions")
    .insert({ title: title.trim().slice(0, 200) || "Untitled", content: content.slice(0, 20000) });
  if (error) throw error;
}

export async function deleteSaved(id: string) {
  const { error } = await supabase.from("saved_instructions").delete().eq("id", id);
  if (error) throw error;
}
