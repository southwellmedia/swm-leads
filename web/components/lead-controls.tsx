"use client";

import { useState, useTransition } from "react";
import { setLeadStatus, addNote, logOutreach } from "@/app/actions";
import type { Database } from "@/lib/database.types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type OutreachChannel = Database["public"]["Enums"]["outreach_channel"];

const STATUSES: LeadStatus[] = [
  "new", "qualified", "contacted", "replied", "meeting", "won", "lost", "disqualified",
];
const CHANNELS: OutreachChannel[] = ["phone", "email", "form", "linkedin", "in_person", "other"];

const box = { borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" } as const;

export function LeadControls({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<OutreachChannel>("phone");
  const [outcome, setOutcome] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium" style={{ color: "var(--muted)" }}>
          Status
        </label>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => start(() => void setLeadStatus(leadId, e.target.value as LeadStatus))}
          className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
          style={box}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium" style={{ color: "var(--muted)" }}>
          Add a note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
          style={box}
        />
        <button
          disabled={pending || !note.trim()}
          onClick={() =>
            start(async () => {
              await addNote(leadId, note);
              setNote("");
            })
          }
          className="mt-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          Save note
        </button>
      </div>

      <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
        <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          Log outreach
        </div>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as OutreachChannel)}
          className="mt-2 w-full rounded-md border px-2 py-1.5 text-sm"
          style={box}
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="Outcome (voicemail, gatekeeper…)"
          className="mt-2 w-full rounded-md border px-2 py-1.5 text-sm"
          style={box}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="What was said / sent"
          className="mt-2 w-full rounded-md border px-2 py-1.5 text-sm"
          style={box}
        />
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await logOutreach(leadId, channel, outcome, body);
              setOutcome("");
              setBody("");
            })
          }
          className="mt-2 rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          Log it
        </button>
      </div>
    </div>
  );
}
