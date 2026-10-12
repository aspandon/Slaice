import { useState } from "react";
import { Icon } from "../../lib/icons";
import {
  RATIO,
  CH_LABEL,
  variantOf,
  type Ch,
  type Lang,
  type Message,
  type MsgImage,
} from "../../domain/comms";

/* Channel-true previews (AENR-490): one message rendered the way each channel
   delivers it — e-mail hero + rich layout (desktop / mobile), Viber bubble with
   image and button, rich push, and SMS text-only with a part counter. The hero
   is cropped to the channel's ratio around the chosen focus. */

const SENDER = "Akti tou Iliou";
const SAMPLE = { first_name: "Elena", favourite_zone: "Bolivar", points: "620", beach: SENDER };

/** Renders **bold** and *italic* markers as text runs (no HTML injection). */
function Fmt({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
        .map((part, i) =>
          part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
            <em key={i}>{part.slice(1, -1)}</em>
          ) : (
            part
          ),
        )}
    </>
  );
}

function Hero({ img, ch }: { img: MsgImage; ch: Exclude<Ch, "sms"> }) {
  const r = RATIO[ch];
  return (
    <img
      src={img.src}
      alt={img.alt}
      className="w-full object-cover"
      style={{ aspectRatio: `${r.w} / ${r.h}`, objectPosition: `center ${img.focus}` }}
    />
  );
}

export function ChannelPreview({
  m,
  ch,
  lang = "en",
  onCta,
}: {
  m: Message;
  ch: Ch;
  lang?: Lang;
  onCta?: () => void;
}) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const v = variantOf(m, ch, lang, SAMPLE);
  const warn = v.warnings.length > 0 && (
    <ul className="mt-2 space-y-1" aria-label={`${CH_LABEL[ch]} warnings`}>
      {v.warnings.map((w) => (
        <li key={w} className="flex items-start gap-1.5 text-[11.5px] text-amber-800">
          <Icon.alert size={12} className="shrink-0 mt-0.5" /> {w}
        </li>
      ))}
    </ul>
  );
  if (ch === "email")
    return (
      <div>
        <div className="flex justify-end mb-1.5">
          <div
            role="group"
            aria-label="E-mail preview size"
            className="inline-flex rounded-lg ring-1 ring-slate-200 bg-white p-0.5 text-[11px] font-semibold"
          >
            {(["mobile", "desktop"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={device === d}
                onClick={() => setDevice(d)}
                className={`px-2 py-0.5 rounded-md capitalize ${device === d ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div
          className={`mx-auto rounded-2xl ring-1 ring-slate-200 bg-white shadow-lift overflow-hidden transition-all ${device === "mobile" ? "max-w-[300px]" : "max-w-full"}`}
        >
          <div className="px-3 py-2 border-b border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Icon.mail size={12} /> {SENDER} &lt;hello@aktitouiliou.gr&gt;
            </div>
            <div className="font-semibold text-navy-900 text-[12.5px] mt-0.5 truncate">
              {v.title || "No subject"}
            </div>
          </div>
          {v.image && <Hero img={v.image} ch="email" />}
          <div className="p-3.5">
            <div className="font-display font-bold text-navy-900 text-[15px] leading-snug">
              {v.title}
            </div>
            <p className="text-[12.5px] text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">
              <Fmt text={v.body} />
            </p>
            {m.promoCode && (
              <div className="mt-2 inline-block rounded-lg border border-dashed border-teal-500 px-2 py-0.5 text-[11px] font-mono font-semibold text-teal-700">
                {m.promoCode}
              </div>
            )}
            {v.cta && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onCta}
                  className="inline-flex items-center gap-1 bg-navy-900 text-white text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-navy-800 transition"
                >
                  {v.cta} →
                </button>
              </div>
            )}
          </div>
          <div className="px-3.5 py-2 bg-slate-50 text-[10px] text-slate-400 leading-snug">
            {v.footer}
          </div>
        </div>
        {warn}
      </div>
    );
  if (ch === "viber")
    return (
      <div>
        <div className="rounded-2xl bg-[#f4f2fb] ring-1 ring-[#7360f2]/25 p-3 max-w-[320px] mx-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7360f2] mb-1.5">
            <Icon.chat size={12} /> Viber · {SENDER}
          </div>
          <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
            {v.image && <Hero img={v.image} ch="viber" />}
            <div className="px-3 py-2 text-[12.5px] text-navy-900 leading-snug whitespace-pre-wrap">
              {v.title && <b className="block mb-0.5">{v.title}</b>}
              <Fmt text={v.body} />
              {m.promoCode && (
                <span className="block mt-1 font-mono text-[11px] text-[#7360f2]">
                  Code {m.promoCode}
                </span>
              )}
            </div>
            {v.cta && (
              <button
                type="button"
                onClick={onCta}
                className="block w-full border-t border-slate-100 py-1.5 text-[12px] font-semibold text-[#7360f2] hover:bg-[#f4f2fb]"
              >
                {v.cta}
              </button>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 px-1">{v.footer}</div>
        </div>
        {warn}
      </div>
    );
  if (ch === "sms")
    return (
      <div>
        <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3 max-w-[320px] mx-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mb-1.5">
            <Icon.phone size={12} /> SMS · AKTI
          </div>
          <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-sm px-3 py-2 text-[12.5px] leading-snug ml-auto max-w-[92%] whitespace-pre-wrap">
            {v.body}
            {v.link && <span className="block underline mt-1 font-semibold">{v.link}</span>}
            <span className="block mt-1 text-white/80 text-[11px]">{v.footer}</span>
          </div>
          {v.sms && (
            <div
              className="mt-2 flex justify-end gap-2 text-[11px] text-slate-500 tnum"
              aria-live="polite"
            >
              <span>{v.sms.chars} chars</span>·
              <span>
                {v.sms.segments} part{v.sms.segments === 1 ? "" : "s"}
              </span>
              {v.sms.unicode && (
                <>
                  <span>·</span>
                  <span>Unicode</span>
                </>
              )}
            </div>
          )}
        </div>
        {warn}
      </div>
    );
  return (
    <div>
      <div className="rounded-2xl bg-navy-950 text-white shadow-lift overflow-hidden max-w-[320px] mx-auto">
        <div className="p-3">
          <div className="flex items-center gap-2 text-[11px] text-white/70 mb-1.5">
            <Icon.bell size={12} /> {SENDER} · now
          </div>
          <div className="font-semibold text-[13px]">{v.title}</div>
          <div className="text-[12px] text-white/80 leading-snug mt-0.5">{v.body}</div>
        </div>
        {v.image && <Hero img={v.image} ch="push" />}
        {v.cta && (
          <div className="p-2">
            <button
              type="button"
              onClick={onCta}
              className="w-full bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold rounded-lg px-2.5 py-1.5 ring-1 ring-white/20 transition"
            >
              {v.cta}
            </button>
          </div>
        )}
      </div>
      {warn}
    </div>
  );
}

/** Channel picker tabs over a preview. */
export function PreviewTabs({
  m,
  lang,
  value,
  onChange,
  onCta,
}: {
  m: Message;
  lang?: Lang;
  value: Ch;
  onChange: (c: Ch) => void;
  onCta?: () => void;
}) {
  return (
    <div>
      <div role="tablist" aria-label="Preview channel" className="flex gap-1 mb-2">
        {m.channels.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={value === c}
            onClick={() => onChange(c)}
            className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ring-1 transition ${value === c ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-400"}`}
          >
            {CH_LABEL[c]}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={`${CH_LABEL[value]} preview`}>
        <ChannelPreview m={m} ch={value} lang={lang} onCta={onCta} />
      </div>
    </div>
  );
}
