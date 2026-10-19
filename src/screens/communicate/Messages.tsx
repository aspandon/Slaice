import { useMemo, useRef, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Toggle,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { fileToBackgroundSrc } from "../../lib/image";
import { BUILTIN_SCHEMES, makeCustomScheme } from "../../data/loyalty";
import { ZONES } from "../../data/beach";
import type { LibraryImage } from "../../data/comms";
import {
  CH_LABEL,
  CH_ORDER,
  CTA_TARGETS,
  LANGS,
  LANG_LABEL,
  RATIO,
  TOKENS,
  messageErrors,
  type Ch,
  type Lang,
  type Message,
  type MsgImage,
} from "../../domain/comms";
import { PreviewTabs } from "./Preview";

/* ============ Messages library (AENR-490) ============
   Promotional messages prepared in advance and reused by campaigns and
   automations: one message, per-channel variants, an optional hero image
   (alt text required), a button, personalisation tokens with fallbacks and
   language versions. Saved in the app store (images as compressed data URLs). */

const fmtEdited = (at: string) =>
  new Date(`${at}:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Active loyalty offers that a message can promote. */
export function useOffers() {
  const { loyalty } = useApp();
  return useMemo(
    () =>
      [...BUILTIN_SCHEMES, ...loyalty.customIds.map(makeCustomScheme)]
        .filter((s) => loyalty.config[s.id]?.enabled)
        .map((s) => {
          const values = loyalty.config[s.id]?.values ?? {};
          return {
            id: s.id,
            title: s.custom ? String(values.title || s.title) : s.title,
            summary: s.summarize(values),
          };
        }),
    [loyalty],
  );
}

export const blankMessage = (by: string): Message => ({
  id: `msg-${Date.now().toString(36)}`,
  name: "",
  status: "Draft",
  content: { en: { subject: "", body: "" } },
  channels: ["email", "push"],
  fallbacks: {},
  updatedAt: new Date().toISOString().slice(0, 16),
  updatedBy: by,
});

export function MessagesTab({ onUse }: { onUse: (messageId: string) => void }) {
  const { comms, setComms, toast } = useApp();
  const [view, setView] = useState<"active" | "archived">("active");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Message | null>(null);
  const list = comms.messages.filter(
    (m) =>
      (view === "archived" ? m.archived : !m.archived) &&
      m.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const save = (m: Message) => {
    const stamped = {
      ...m,
      updatedAt: new Date().toISOString().slice(0, 16),
      updatedBy: "Eleni Markou",
    };
    setComms((s) => ({
      ...s,
      messages: s.messages.some((x) => x.id === m.id)
        ? s.messages.map((x) => (x.id === m.id ? stamped : x))
        : [stamped, ...s.messages],
    }));
    toast(
      `“${m.name}” saved${m.status === "Ready" ? " — ready to use in campaigns and automations" : " as a draft"}.`,
      { tone: "success" },
    );
    setEditing(null);
  };
  const duplicate = (m: Message) => {
    const copy = {
      ...m,
      id: `msg-${Date.now().toString(36)}`,
      name: `${m.name} (copy)`,
      status: "Draft" as const,
      archived: false,
    };
    setComms((s) => ({ ...s, messages: [copy, ...s.messages] }));
    toast(`Duplicated as “${copy.name}”.`, { tone: "success" });
  };
  const archive = (m: Message, archived: boolean) => {
    setComms((s) => ({
      ...s,
      messages: s.messages.map((x) => (x.id === m.id ? { ...x, archived } : x)),
    }));
    toast(
      archived
        ? `“${m.name}” archived — campaigns already sent keep their copy.`
        : `“${m.name}” restored.`,
    );
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div
          role="group"
          aria-label="Show messages"
          className="inline-flex rounded-xl ring-1 ring-slate-200 bg-white p-0.5 text-[12.5px] font-semibold"
        >
          {(["active", "archived"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg capitalize ${view === v ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"}`}
            >
              {v} ·{" "}
              {comms.messages.filter((m) => (v === "archived" ? m.archived : !m.archived)).length}
            </button>
          ))}
        </div>
        <label className="flex-1 min-w-[180px] max-w-xs flex items-center gap-1.5 rounded-xl ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-slate-500">
          <Icon.search size={14} />
          <span className="sr-only">Search messages</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages"
            className="w-full bg-transparent text-[13px] outline-none text-ink"
          />
        </label>
        <Btn
          variant="primary"
          icon={Icon.plus}
          className="ml-auto"
          onClick={() => setEditing(blankMessage("Eleni Markou"))}
        >
          New message
        </Btn>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={Icon.mail}
          title={
            view === "archived"
              ? "No archived messages"
              : q
                ? "No messages match"
                : "Build your first message"
          }
          body={
            view === "archived"
              ? "Archived messages stay out of the pickers but keep their history."
              : "Write it once with an image and a button; campaigns and automations reuse it on every channel."
          }
          action={
            view === "active" && !q ? (
              <Btn
                variant="primary"
                icon={Icon.plus}
                onClick={() => setEditing(blankMessage("Eleni Markou"))}
              >
                New message
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((m) => (
            <li key={m.id}>
              <Card className="overflow-hidden h-full flex flex-col">
                <div className="aspect-[2/1] bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center">
                  {m.image ? (
                    <img
                      src={m.image.src}
                      alt={m.image.alt}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `center ${m.image.focus}` }}
                    />
                  ) : (
                    <span className="text-slate-500 text-[12px] inline-flex items-center gap-1.5">
                      <Icon.doc size={14} /> Text only
                    </span>
                  )}
                </div>
                <div className="p-3.5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-navy-900 leading-snug">{m.name}</div>
                    <Badge tone={m.status === "Ready" ? "green" : "slate"}>{m.status}</Badge>
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">
                    {m.content.en.subject || m.content.en.body}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {m.channels.map((c) => (
                      <Badge key={c} tone="indigo">
                        {CH_LABEL[c]}
                      </Badge>
                    ))}
                    {Object.keys(m.content).length > 1 && (
                      <Badge tone="blue">{Object.keys(m.content).length} languages</Badge>
                    )}
                    {m.promoCode && <Badge tone="amber">{m.promoCode}</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-auto pt-2">
                    Edited {fmtEdited(m.updatedAt)} · {m.updatedBy}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {!m.archived && (
                      <Btn
                        size="sm"
                        variant="primary"
                        icon={Icon.edit}
                        onClick={() => setEditing(m)}
                      >
                        Edit
                      </Btn>
                    )}
                    {!m.archived && m.status === "Ready" && (
                      <Btn size="sm" variant="ghost" icon={Icon.send} onClick={() => onUse(m.id)}>
                        Use in campaign
                      </Btn>
                    )}
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={Icon.copy}
                      aria-label={`Duplicate ${m.name}`}
                      onClick={() => duplicate(m)}
                    >
                      Duplicate
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      icon={m.archived ? Icon.refresh : Icon.archive}
                      onClick={() => archive(m, !m.archived)}
                    >
                      {m.archived ? "Restore" : "Archive"}
                    </Btn>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <MessageEditor initial={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

/* ---------- Editor ---------- */
function MessageEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Message;
  onClose: () => void;
  onSave: (m: Message) => void;
}) {
  const { comms, setComms, toast, zoneLogos } = useApp();
  const offers = useOffers();
  const [m, setM] = useState<Message>(initial);
  const [lang, setLang] = useState<Lang>("en");
  const [pv, setPv] = useState<Ch>(initial.channels[0] ?? "email");
  const [tried, setTried] = useState(false);
  const [picker, setPicker] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const errors = messageErrors(m);
  const c = m.content[lang] ?? { subject: "", body: "" };
  const setContent = (patch: Partial<typeof c>) =>
    setM((x) => ({ ...x, content: { ...x.content, [lang]: { ...c, ...patch } } }));
  const insert = (before: string, after = "") => {
    const el = bodyRef.current;
    const s = el?.selectionStart ?? c.body.length;
    const e = el?.selectionEnd ?? c.body.length;
    setContent({
      body: c.body.slice(0, s) + before + c.body.slice(s, e) + after + c.body.slice(e),
    });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + before.length, e + before.length);
    });
  };
  const usedTokens = TOKENS.filter((t) =>
    Object.values(m.content).some((x) => x && `${x.subject} ${x.body}`.includes(`{${t.key}}`)),
  );
  const setImage = (img?: MsgImage) => setM((x) => ({ ...x, image: img }));
  const toggleCh = (ch: Ch) =>
    setM((x) => {
      const channels = x.channels.includes(ch)
        ? x.channels.filter((y) => y !== ch)
        : CH_ORDER.filter((y) => y === ch || x.channels.includes(y));
      if (!channels.includes(pv) && channels[0]) setPv(channels[0]);
      return { ...x, channels };
    });
  const save = () => {
    setTried(true);
    if (errors.length) return;
    onSave(m);
  };
  const library: LibraryImage[] = [
    ...comms.images,
    ...Object.entries(zoneLogos).map(([id, src]) => ({
      id: `logo-${id}`,
      src,
      name: `${ZONES.find((z) => z.id === id)?.name ?? id} logo`,
      source: "Zone logo" as const,
    })),
  ];
  const upload = async (f: File) => {
    if (!/image\/(jpeg|png|webp)/.test(f.type)) {
      toast("Use a JPG, PNG or WebP image.", { tone: "error" });
      return;
    }
    try {
      const src = await fileToBackgroundSrc(f, { maxW: 1200, maxH: 800, quality: 0.8 });
      const img: LibraryImage = {
        id: `img-${Date.now().toString(36)}`,
        name: f.name.replace(/\.\w+$/, ""),
        src,
        source: "Uploaded",
      };
      setComms((s) => ({ ...s, images: [img, ...s.images] }));
      setImage({ src, name: img.name, alt: "", focus: "center" });
      setPicker(false);
      toast(
        `Image compressed to ${Math.round((src.length * 3) / 4 / 1024)} KB — add alt text before saving.`,
        { tone: "success" },
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "That image could not be used.", { tone: "error" });
    }
  };
  const testSend = () =>
    toast(
      `Demo — test ${CH_LABEL[pv]} sent to you (eleni.markou@aktitouiliou.gr) with sample data for Elena.`,
      { tone: "success" },
    );
  const isNew = !comms.messages.some((x) => x.id === initial.id);
  return (
    <Modal
      open
      wide="xl"
      onClose={onClose}
      title={isNew ? "New message" : `Edit “${initial.name}”`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <Btn variant="ghost" icon={Icon.send} onClick={testSend}>
            Send test to me
          </Btn>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn variant="primary" icon={Icon.check} onClick={save}>
              Save message
            </Btn>
          </div>
        </div>
      }
    >
      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-3.5 min-w-0">
          {tried && errors.length > 0 && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[12.5px] text-rose-800"
            >
              <div className="font-semibold mb-0.5">Fix before saving</div>
              <ul className="list-disc pl-4">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <Field label="Message name">
              <Input
                value={m.name}
                onChange={(e) => setM({ ...m, name: e.target.value })}
                placeholder="e.g. August weekend offer"
              />
            </Field>
            <div className="pb-2">
              <Toggle
                label="Ready to use"
                on={m.status === "Ready"}
                onChange={(v) => setM({ ...m, status: v ? "Ready" : "Draft" })}
              />
            </div>
          </div>
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700 mb-1">Channels</legend>
            <div className="flex flex-wrap gap-1.5">
              {CH_ORDER.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={m.channels.includes(ch)}
                  onClick={() => toggleCh(ch)}
                  className={`px-3 py-1.5 rounded-xl text-[12.5px] font-semibold ring-1 transition ${m.channels.includes(ch) ? "bg-teal-50 ring-teal-500 text-teal-800" : "bg-white ring-slate-200 text-slate-600 hover:ring-slate-400"}`}
                >
                  {m.channels.includes(ch) && (
                    <Icon.check size={12} className="inline mr-1 -mt-0.5" />
                  )}
                  {CH_LABEL[ch]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-3">
            <div role="tablist" aria-label="Language version" className="flex flex-wrap gap-1">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={lang === l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ring-1 ${lang === l ? "bg-navy-900 text-white ring-navy-900" : m.content[l] ? "bg-white text-navy-900 ring-slate-300" : "bg-white text-slate-500 ring-slate-200 border-dashed"}`}
                >
                  {l.toUpperCase()}
                  {l === "en" ? " *" : m.content[l] ? "" : " +"}
                </button>
              ))}
            </div>
            <div className="text-[11.5px] text-slate-500 -mt-1">
              {lang === "en"
                ? "English is required. Guests get their language when it exists, otherwise English."
                : m.content[lang]
                  ? `${LANG_LABEL[lang]} version — sent to guests whose language is ${LANG_LABEL[lang]}.`
                  : `No ${LANG_LABEL[lang]} version — these guests get English. Start typing to add one.`}
              {lang !== "en" && m.content[lang] && (
                <button
                  type="button"
                  className="ml-2 font-semibold text-rose-600 hover:underline"
                  onClick={() => {
                    const { [lang]: _, ...rest } = m.content;
                    setM({ ...m, content: rest as Message["content"] });
                  }}
                >
                  Remove version
                </button>
              )}
            </div>
            <Field label="Title / subject">
              <Input
                value={c.subject}
                onChange={(e) => setContent({ subject: e.target.value })}
                placeholder="Shown as the e-mail subject and push title"
              />
            </Field>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label htmlFor="msg-body" className="text-[12px] font-semibold text-slate-700">
                  Text
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insert("**", "**")}
                    aria-label="Bold"
                    className="w-7 h-7 rounded-md ring-1 ring-slate-200 bg-white font-bold text-[12px] hover:ring-slate-400"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insert("*", "*")}
                    aria-label="Italic"
                    className="w-7 h-7 rounded-md ring-1 ring-slate-200 bg-white italic text-[12px] hover:ring-slate-400"
                  >
                    I
                  </button>
                  <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden />
                  {TOKENS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => insert(`{${t.key}}`)}
                      className="px-2 h-7 rounded-md ring-1 ring-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:ring-teal-400 hover:text-teal-700"
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="msg-body"
                ref={bodyRef}
                rows={4}
                value={c.body}
                onChange={(e) => setContent({ body: e.target.value })}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/70 outline-none"
              />
            </div>
            {usedTokens.length > 0 && (
              <div>
                <div className="text-[12px] font-semibold text-slate-700 mb-1">Fallback values</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {usedTokens.map((t) => (
                    <Field
                      key={t.key}
                      label={
                        <span className="font-normal text-slate-500">
                          When <code className="text-[11px]">{`{${t.key}}`}</code> is unknown
                        </span>
                      }
                    >
                      <Input
                        value={m.fallbacks[t.key] ?? t.fallback}
                        onChange={(e) =>
                          setM({ ...m, fallbacks: { ...m.fallbacks, [t.key]: e.target.value } })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-semibold text-slate-700">Image</div>
              <div className="flex gap-1.5">
                <Btn size="sm" variant="ghost" icon={Icon.image} onClick={() => setPicker(true)}>
                  {m.image ? "Replace" : "Add image"}
                </Btn>
                {m.image && (
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon={Icon.trash}
                    onClick={() => setImage(undefined)}
                  >
                    Remove
                  </Btn>
                )}
              </div>
            </div>
            {m.image ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(RATIO) as (keyof typeof RATIO)[])
                    .filter(
                      (k, i, arr) => arr.findIndex((x) => RATIO[x].label === RATIO[k].label) === i,
                    )
                    .map((k) => (
                      <figure key={k} className="w-24">
                        <img
                          src={m.image?.src}
                          alt=""
                          className="w-full rounded-md object-cover ring-1 ring-slate-200"
                          style={{
                            aspectRatio: `${RATIO[k].w}/${RATIO[k].h}`,
                            objectPosition: `center ${m.image?.focus}`,
                          }}
                        />
                        <figcaption className="text-[10px] text-slate-500 mt-0.5">
                          {RATIO[k].label}
                        </figcaption>
                      </figure>
                    ))}
                </div>
                <div className="grid sm:grid-cols-[1fr_170px] gap-2">
                  <Field
                    label="Alt text (required)"
                    hint="Describe the image for screen readers and when images are blocked."
                  >
                    <Input
                      value={m.image.alt}
                      onChange={(e) => setImage(m.image && { ...m.image, alt: e.target.value })}
                      aria-invalid={tried && !m.image.alt.trim()}
                      className={tried && !m.image.alt.trim() ? "ring-2 ring-rose-400" : ""}
                      placeholder="e.g. Teal umbrellas over the front row"
                    />
                  </Field>
                  <Field label="Crop focus">
                    <Select
                      value={m.image.focus}
                      onChange={(e) =>
                        setImage(
                          m.image && { ...m.image, focus: e.target.value as MsgImage["focus"] },
                        )
                      }
                      options={[
                        { v: "top", l: "Keep the top" },
                        { v: "center", l: "Keep the centre" },
                        { v: "bottom", l: "Keep the bottom" },
                      ]}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-slate-500">
                No image — e-mail, Viber and push send text only. SMS never carries images.
              </div>
            )}
          </div>

          <div className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-2.5">
            <Toggle
              label="Call-to-action button"
              on={!!m.cta}
              onChange={(v) =>
                setM({ ...m, cta: v ? { label: "Plan my visit", target: "plan" } : undefined })
              }
            />
            {m.cta && (
              <div className="grid sm:grid-cols-2 gap-2.5">
                <Field label="Button label">
                  <Input
                    value={m.cta.label}
                    onChange={(e) =>
                      setM({ ...m, cta: m.cta && { ...m.cta, label: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Opens">
                  <Select
                    value={m.cta.target}
                    onChange={(e) =>
                      setM({
                        ...m,
                        cta: m.cta && {
                          ...m.cta,
                          target: e.target.value as NonNullable<Message["cta"]>["target"],
                        },
                      })
                    }
                    options={CTA_TARGETS}
                  />
                </Field>
                {m.cta.target === "url" && (
                  <div className="sm:col-span-2">
                    <Field label="URL">
                      <Input
                        value={m.cta.url ?? ""}
                        onChange={(e) =>
                          setM({ ...m, cta: m.cta && { ...m.cta, url: e.target.value } })
                        }
                        placeholder="https://"
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Field label="Loyalty offer">
                <Select
                  value={m.offerId ?? ""}
                  onChange={(e) => setM({ ...m, offerId: e.target.value || undefined })}
                  options={[
                    { v: "", l: offers.length ? "None" : "No active schemes" },
                    ...offers.map((o) => ({ v: o.id, l: o.title })),
                  ]}
                />
              </Field>
              <Field label="Promo code">
                <Input
                  value={m.promoCode ?? ""}
                  onChange={(e) =>
                    setM({
                      ...m,
                      promoCode: e.target.value.toUpperCase().replace(/\s/g, "") || undefined,
                    })
                  }
                  placeholder="e.g. AUG20"
                />
              </Field>
            </div>
          </div>
          <div className="text-[11.5px] text-slate-500 flex items-start gap-1.5">
            <Icon.shield size={13} className="shrink-0 mt-0.5 text-teal-600" />
            An opt-out footer is added to every channel automatically, and promotional sends only
            reach guests with marketing consent for that channel.
          </div>
        </div>
        <aside className="lg:sticky lg:top-0 h-max">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Preview · sample guest Elena
          </div>
          {m.channels.length ? (
            <PreviewTabs
              m={m}
              lang={lang}
              value={m.channels.includes(pv) ? pv : m.channels[0]}
              onChange={setPv}
            />
          ) : (
            <div className="text-[12px] text-slate-500">Pick a channel to preview.</div>
          )}
        </aside>
      </div>
      {picker && (
        <Modal open onClose={() => setPicker(false)} title="Choose an image" wide>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[12.5px] text-slate-600">
              Image library — tenant images and zone logos. Uploads are compressed in the browser.
            </div>
            <label className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 text-white px-3 py-2 text-[13px] font-semibold cursor-pointer hover:bg-navy-800 focus-within:ring-2 focus-within:ring-teal-500">
              <Icon.upload size={14} /> Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {library.map((img) => (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => {
                    setImage({
                      src: img.src,
                      name: img.name,
                      alt: m.image?.src === img.src ? m.image.alt : "",
                      focus: "center",
                    });
                    setPicker(false);
                  }}
                  className="w-full text-left rounded-xl ring-1 ring-slate-200 overflow-hidden hover:ring-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500 bg-white"
                >
                  <img
                    src={img.src}
                    alt=""
                    className="w-full aspect-[2/1] object-cover bg-slate-100"
                  />
                  <div className="px-2 py-1.5 text-[12px] font-semibold text-navy-900 truncate">
                    {img.name}
                  </div>
                  <div className="px-2 pb-1.5 -mt-1 text-[10.5px] text-slate-500">{img.source}</div>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </Modal>
  );
}
