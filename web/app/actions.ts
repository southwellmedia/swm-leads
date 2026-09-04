"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type OutreachChannel = Database["public"]["Enums"]["outreach_channel"];

export async function setLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function addNote(leadId: string, body: string) {
  const text = body.trim();
  if (!text) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: leadId, body: text, author_id: user?.id ?? null });
  if (error) throw new Error(error.message);
  revalidatePath(`/leads/${leadId}`);
}

export async function logOutreach(
  leadId: string,
  channel: OutreachChannel,
  outcome: string,
  body: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("outreach").insert({
    lead_id: leadId,
    channel,
    direction: "outbound",
    outcome: outcome.trim() || null,
    body: body.trim() || null,
    author_id: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  // Logging the first touch moves the lead along, but never drags a further-on
  // lead backwards -- a reply already recorded outranks "we sent something".
  const { data: lead } = await supabase.from("leads").select("status").eq("id", leadId).single();
  if (lead?.status === "new" || lead?.status === "qualified") {
    await supabase.from("leads").update({ status: "contacted" }).eq("id", leadId);
  }

  revalidatePath("/");
  revalidatePath(`/leads/${leadId}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
