"use client";
import { useEffect, useRef, useState } from "react";
import CommissionsPage from "../../design/CommissionsPage";
import ReferencesPage, { type ReferenceNavigationGuard } from "../../design/ReferencesPage";
import PreferencesPage from "../../design/PreferencesPage";
import { type ReferenceDraft } from "../../design/references";
import { normalizeDimension, preferenceSizes, type PreferencesDraft } from "../../design/preferences";
import { sessionLifecycle } from "../identity/session-lifecycle";

// Browser-memory checkpoint survives Next route mounts; never persisted to storage.
let checkpoint: { owner: string; reference: ReferenceDraft | null; preferences: PreferencesDraft | null } | null = null;
sessionLifecycle.registerPrivateCache(() => { checkpoint = null; });

export type CommissionBody = { idea: string; changes: string; style: string; size: string; execution: string };
export function useCommissionSubmission() {
  const [status, setStatus] = useState("");
  const [receipt, setReceipt] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  const submission = useRef<{ id: string; body: CommissionBody } | null>(null);
  useEffect(() => {
    const clear = () => { generation.current++; pending.current = false; submission.current = null; setStatus(""); setReceipt(""); };
    const unregister = sessionLifecycle.registerPrivateCache(clear);
    return () => { unregister(); generation.current++; };
  }, []);
  const submit = async (body: CommissionBody) => {
    if (pending.current || receipt) return false;
    const attempt = generation.current;
    const revision = sessionLifecycle.capture();
    pending.current = true; setStatus("saving");
    if (!submission.current) submission.current = { id: crypto.randomUUID(), body: { ...body } };
    const draft = submission.current;
    const current = () => generation.current === attempt && sessionLifecycle.current(revision);
    try {
      const bootstrap = await fetch("/api/v1/auth/session/csrf", { method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!current()) return false;
      if (bootstrap.status === 401) { sessionLifecycle.observe(null, revision); return false; }
      if (bootstrap.status === 403) { submission.current = null; setStatus("rejected"); return false; }
      if (!bootstrap.ok) throw new Error("Unavailable");
      const csrf = await bootstrap.json();
      if (typeof csrf.csrf_token !== "string" || !csrf.csrf_token) throw new Error("Invalid CSRF");
      if (!current()) return false;
      const response = await fetch("/api/v1/account/commissions", { method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token }, body: JSON.stringify({ ...draft.body, submission_id: draft.id }) });
      if (!current()) return false;
      if (response.status === 401) { sessionLifecycle.observe(null, revision); return false; }
      if (!response.ok) {
        if ([422, 403, 409].includes(response.status)) { submission.current = null; setStatus("rejected"); return false; }
        throw new Error("Unconfirmed");
      }
      const result = await response.json();
      if (!current()) return false;
      if (typeof result.id !== "string" || !result.id || result.status !== "awaiting_review") throw new Error("Invalid receipt");
      setReceipt(result.id); setStatus("saved"); return true;
    } catch { if (current()) setStatus("unknown"); return false; }
    finally { if (generation.current === attempt) pending.current = false; }
  };
  return { status, receipt, submit };
}

export default function CommissionFlow({ path, language, onNavigate, registerGuard }: {
  path: string; language: 0 | 1; onNavigate: (name: string, route: string) => void;
  registerGuard: (guard: ReferenceNavigationGuard | null) => void;
}) {
  const [owner, setOwner] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [reference, setReference] = useState<ReferenceDraft | null>(null);
  const [preferences, setPreferences] = useState<PreferencesDraft | null>(null);
  const submission = useCommissionSubmission();
  useEffect(() => {
    let active = true;
    let request = 0;
    const check = async () => {
      const ticket = ++request;
      const revision = sessionLifecycle.capture();
      try {
        const response = await fetch("/api/v1/auth/session", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
        if (!active || ticket !== request || !sessionLifecycle.current(revision)) return;
        if (response.status === 401) { sessionLifecycle.observe(null, revision); setOwner(null); setReady(true); return; }
        if (!response.ok) return;
        const result = await response.json();
        if (!active || ticket !== request || !sessionLifecycle.current(revision)) return;
        if (typeof result.account_id !== "string" || !result.account_id) return;
        sessionLifecycle.observe(result.account_id, revision);
        if (checkpoint && checkpoint.owner === result.account_id) { setReference(checkpoint.reference); setPreferences(checkpoint.preferences); }
        else checkpoint = null;
        setOwner(result.account_id); setReady(true);
      } catch { /* An unverified session stays locked; it does not establish a guest. */ }
    };
    const unregister = sessionLifecycle.registerPrivateCache(() => {
      setReference(null); setPreferences(null); setOwner(null); setReady(false); setEpoch(value => value + 1);
    });
    const unsubscribe = sessionLifecycle.subscribe(event => { if (event.type === "revalidate" || event.type === "changed") void check(); });
    void check();
    return () => { active = false; request++; unregister(); unsubscribe(); };
  }, []);
  const signedIn = ready && owner !== null;
  const key = `${owner}:${epoch}`;
  const guardedNavigate = (name: string, route: string) => {
    if (["unknown", "saving"].includes(submission.status)) return;
    onNavigate(name, route);
  };
  const guard = (candidate: ReferenceNavigationGuard | null) => registerGuard(
    ["unknown", "saving"].includes(submission.status) ? () => false : candidate,
  );
  const common = { language, signedIn, onNavigate: guardedNavigate, live: true, onDemoSignIn: () => {}, registerGuard: guard };
  if (/\/preferences\/?$/.test(path)) return <PreferencesPage key={key} {...common} reference={reference} saved={preferences} onSave={draft => { if (signedIn && owner) { setPreferences(draft); checkpoint = { owner, reference, preferences: draft }; } }} liveSubmission={{ ...submission, submit: draft => {
    const size = preferenceSizes.find(value => value.id === draft.size);
    return submission.submit({ idea: reference?.brief || "", changes: "", style: draft.style,
      execution: draft.execution === "hand" ? "handmade" : "digital",
      size: size ? `${size.width} × ${size.height} ${size.unit}` : `${normalizeDimension(draft.width)} × ${normalizeDimension(draft.height)} cm` });
  } }} />;
  if (/\/references?\/?$/.test(path)) return <ReferencesPage key={key} {...common} draft={reference} onSave={draft => { if (signedIn && owner) { setReference(draft); checkpoint = { owner, reference: draft, preferences }; } }} />;
  return <CommissionsPage key={`${key}:${ready}`} {...common} initialMode={ready ? "normal" : "loading"} />;
}
