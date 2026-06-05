import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Modal, Btn, Spinner } from "./ui";
import { useApp } from "../app/store";
import { BeachBackdrop } from "./Beach";
import { BACKGROUNDS } from "../data/backgrounds";
import type { BeachBackground } from "../domain/types";
import { fileToBackgroundSrc } from "../lib/image";

/* Background gallery — the Manager/Admin picks the beach scene customers see on
   the Sunbed Booking map: a built-in preset or an uploaded photo. Selection
   previews live in a `draft`; nothing is applied to the tenant until "Use
   background". Every option renders as a real, miniature scene. */
export function BackgroundPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { background, setBackground, toast } = useApp();
  const [draft, setDraft] = useState<BeachBackground>(background);
  const [busy, setBusy] = useState(false);

  // Re-sync the draft to the live value each time the dialog opens.
  useEffect(() => {
    if (open) setDraft(background);
  }, [open, background]);

  const simple = BACKGROUNDS.filter((p) => p.tier === "simple");
  const elaborate = BACKGROUNDS.filter((p) => p.tier === "elaborate");
  const selectedId = draft.kind === "preset" ? draft.id : null;

  const onUpload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const src = await fileToBackgroundSrc(file);
      setDraft({ kind: "custom", src, name: file.name });
      toast("Photo ready — preview it, then Use background.", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "That image could not be used.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    setBackground(draft);
    onClose();
    toast("Beach background updated — customers see it on the booking map.", { tone: "success" });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Beach background"
      wide
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={Icon.check} onClick={apply}>Use background</Btn>
        </>
      }
    >
      <p className="text-[13px] text-slate-600 -mt-1 mb-4">
        The scene customers see behind the beach on the Sunbed Booking map. Pick a preset or upload your own aerial photo.
      </p>

      <Section title="Simple" hint="Clean gradients">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {simple.map((p) => (
            <PreviewTile key={p.id} selected={selectedId === p.id} onClick={() => setDraft({ kind: "preset", id: p.id })} name={p.name} blurb={p.blurb}>
              <BeachBackdrop pos="absolute" className="inset-0 rounded-none" background={{ kind: "preset", id: p.id }} preview />
            </PreviewTile>
          ))}
        </div>
      </Section>

      <Section title="Elaborate" hint="Illustrated scenes">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {elaborate.map((p) => (
            <PreviewTile key={p.id} selected={selectedId === p.id} onClick={() => setDraft({ kind: "preset", id: p.id })} name={p.name} blurb={p.blurb}>
              <BeachBackdrop pos="absolute" className="inset-0 rounded-none" background={{ kind: "preset", id: p.id }} preview />
            </PreviewTile>
          ))}
        </div>
      </Section>

      <Section title="Your own photo" hint="Uploaded to this tenant">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {draft.kind === "custom" && (
            <PreviewTile selected onClick={() => { /* already selected */ }} name="Custom photo" blurb={draft.name || "Uploaded image"}>
              <BeachBackdrop pos="absolute" className="inset-0 rounded-none" background={draft} />
            </PreviewTile>
          )}
          <label
            className={`relative rounded-2xl ring-2 ring-dashed transition cursor-pointer flex flex-col items-center justify-center gap-1.5 aspect-[16/9] text-center px-3 ${
              busy ? "ring-teal-300 bg-teal-50/50" : "ring-slate-300 hover:ring-teal-400 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              aria-label="Upload a custom beach photo"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = ""; // allow re-picking the same file
                void onUpload(f);
              }}
            />
            <span className="w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 grid place-items-center text-teal-600 shadow-sm">
              {busy ? <Spinner size={16} /> : <Icon.upload size={18} />}
            </span>
            <span className="text-[12px] font-semibold text-navy-900">{busy ? "Processing…" : draft.kind === "custom" ? "Replace photo" : "Upload a photo"}</span>
            <span className="text-[11px] text-slate-500">JPG, PNG or WebP</span>
          </label>
        </div>
      </Section>
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{title}</h3>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function PreviewTile({ selected, onClick, name, blurb, children }: {
  selected?: boolean;
  onClick: () => void;
  name: ReactNode;
  blurb: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative text-left rounded-2xl overflow-hidden ring-2 transition ${
        selected ? "ring-teal-500 shadow-lift" : "ring-slate-200 hover:ring-slate-300 hover:-translate-y-0.5"
      }`}
    >
      <div className="relative aspect-[16/9] bg-slate-100">
        {children}
        {selected && (
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-teal-500 text-white grid place-items-center shadow ring-2 ring-white">
            <Icon.check size={13} />
          </span>
        )}
      </div>
      <div className="px-3 py-2 bg-white">
        <div className="text-[13px] font-semibold text-navy-900 leading-tight truncate">{name}</div>
        <div className="text-[11px] text-slate-500 leading-tight truncate">{blurb}</div>
      </div>
    </button>
  );
}
