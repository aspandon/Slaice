import { useEffect, useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, Card, Field, Input, Modal, Select, DateInput } from "../../components/ui";
import { useApp } from "../../app/store";
import {
  CH_LABEL,
  CH_ORDER,
  WEEKDAYS,
  addDay,
  fmtAt,
  occurrences,
  scheduleLabel,
  shiftOutOfQuiet,
  type Campaign,
  type Ch,
  type Message,
  type Schedule,
} from "../../domain/comms";
import { ChannelPreview } from "./Preview";
import { useOffers } from "./Messages";
import { reachOf, segName, useCommsEngine } from "./engine";

/* ============ Compose campaign (AENR-492 A) ============
   Audience (a CRM segment, evaluated again at send time) · content (a saved
   message, or free text) · channel · delivery: send now, once on a date, or
   weekly between two dates. Quiet hours move push / Viber / SMS sends out of
   the night with a warning. Review → confirm creates the campaign. */

type When = "now" | "once" | "weekly";
const CH_COLOR: Record<Ch, string> = {
  push: "#13315c",
  email: "#0d9488",
  viber: "#7360f2",
  sms: "#16a34a",
};
const CH_ICON = { push: Icon.bell, email: Icon.mail, viber: Icon.chat, sms: Icon.phone };

export function ComposeTab({
  presetMessage,
  onDone,
  onSetupChannel,
}: {
  presetMessage?: string;
  onDone: () => void;
  onSetupChannel: () => void;
}) {
  const { toast, go, hint, clearHint, channels } = useApp();
  const { comms, setComms, audience, runCampaign } = useCommsEngine();
  const offers = useOffers();
  const ready = comms.messages.filter((m) => !m.archived && m.status === "Ready");
  const [segId, setSegId] = useState("sys-vip");
  const [messageId, setMessageId] = useState(presetMessage ?? "");
  const [text, setText] = useState(
    "☀️ Weekend offer: 20% off front-row sunbeds at Akti tou Iliou. Book now!",
  );
  const [offerId, setOfferId] = useState("");
  const [channel, setChannel] = useState<Ch>("push");
  const [name, setName] = useState("");
  const [when, setWhen] = useState<When>("now");
  const today = comms.clock.slice(0, 10);
  const [onceDate, setOnceDate] = useState(addDay(today, 5));
  const [onceTime, setOnceTime] = useState("10:00");
  const [wk, setWk] = useState({ weekday: 5, time: "10:00", from: today, to: "2026-09-30" });
  const [review, setReview] = useState(false);
  useEffect(() => {
    if (presetMessage) setMessageId(presetMessage);
  }, [presetMessage]);

  // Loyalty › “Promote” deep-links here with an offer pre-loaded.
  useEffect(() => {
    if (hint?.persona === "admin" && hint?.page === "communicate" && hint?.promote) {
      const o = offers.find((x) => x.id === hint.promote);
      if (o) {
        setOfferId(o.id);
        setMessageId("");
        setText(`🎁 ${o.title} — ${o.summary}. Tap to claim your reward at Akti tou Iliou!`);
      }
      clearHint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

  const saved = ready.find((m) => m.id === messageId);
  const offer = offers.find((o) => o.id === (saved?.offerId ?? offerId));
  // Free text becomes a one-off message so it previews like a saved one.
  const msg: Message = saved ?? {
    id: "inline",
    name: name || "Campaign",
    status: "Ready",
    content: { en: { subject: "Weekend at the beach", body: text } },
    channels: [channel],
    fallbacks: {},
    cta: offer ? { label: "Claim reward", target: "promo" } : undefined,
    updatedAt: comms.clock,
    updatedBy: "Eleni Markou",
  };
  const chOptions = saved ? CH_ORDER.filter((c) => saved.channels.includes(c)) : CH_ORDER;
  useEffect(() => {
    if (!chOptions.includes(channel) && chOptions[0]) setChannel(chOptions[0]);
  }, [chOptions, channel]);

  const members = useMemo(
    () => (segId === "all" ? audience.guests : audience.members(segId)),
    [audience, segId],
  );
  const rs = members.map(audience.recipient);
  const reach = reachOf(rs, [channel], comms.settings.excludeOpenRefunds);
  const sName = segName(audience.segments, segId);
  const connected = channels[channel].connected;

  const schedule: Schedule =
    when === "now"
      ? { kind: "now" }
      : when === "once"
        ? { kind: "once", at: `${onceDate}T${onceTime}` }
        : { kind: "weekly", ...wk };
  const first = when === "now" ? comms.clock : occurrences(schedule)[0];
  const shift = first ? shiftOutOfQuiet(first, channel, comms.settings.quiet) : null;
  const errors = [
    !saved && !text.trim() ? "Write a message or pick a saved one." : "",
    !connected ? `${CH_LABEL[channel]} isn't connected yet.` : "",
    when === "once" && `${onceDate}T${onceTime}` <= comms.clock ? "Pick a time in the future." : "",
    when === "weekly" && !occurrences(schedule).some((a) => a > comms.clock)
      ? "The weekly range has no future dates."
      : "",
  ].filter(Boolean);

  const create = () => {
    const id = `cmp-${Date.now().toString(36)}`;
    const c: Campaign = {
      id,
      name: name.trim() || (saved ? saved.name : `${sName} · ${CH_LABEL[channel]}`),
      messageId: saved?.id,
      inline: saved ? undefined : { subject: "Weekend at the beach", body: text },
      channel,
      segmentId: segId,
      segmentName: sName,
      offerId: offer?.id,
      schedule:
        when === "weekly"
          ? ({ ...schedule, from: wk.from < today ? today : wk.from } as Schedule)
          : schedule,
      reachAtSchedule: reach,
      runs: [],
      createdAt: comms.clock,
      createdBy: "Eleni Markou",
    };
    setComms((s) => {
      const withC = { ...s, campaigns: [c, ...s.campaigns] };
      if (when !== "now") return withC;
      // Send now: one occurrence at the demo clock (moved by quiet hours if needed).
      if (shift?.shifted)
        return {
          ...withC,
          campaigns: withC.campaigns.map((x) =>
            x.id === id ? { ...x, schedule: { kind: "once", at: shift.at } } : x,
          ),
        };
      return runCampaign(
        {
          ...withC,
          campaigns: withC.campaigns.map((x) =>
            x.id === id ? { ...x, schedule: { kind: "once", at: comms.clock } } : x,
          ),
        },
        { ...c, schedule: { kind: "once", at: comms.clock } },
        comms.clock,
      );
    });
    setReview(false);
    toast(
      when === "now"
        ? shift?.shifted
          ? `Quiet hours — “${c.name}” will go out ${fmtAt(shift.at)}.`
          : `“${c.name}” sent to ${sName} via ${CH_LABEL[channel]}. Results are in Campaigns.`
        : `“${c.name}” scheduled — ${scheduleLabel(c.schedule)}.`,
      { tone: "success" },
    );
    onDone();
  };

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5">
      <Card className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Campaign name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={saved ? saved.name : "e.g. August weekend · VIP"}
            />
          </Field>
          <Field
            label="Audience segment"
            hint="Evaluated again when the campaign sends — new members are included."
          >
            <Select
              value={segId}
              onChange={(e) => setSegId(e.target.value)}
              options={[
                { v: "all", l: `All guests (${audience.guests.length})` },
                ...audience.segments.map((s) => ({
                  v: s.id,
                  l: `${s.name} (${audience.members(s.id).length})`,
                })),
              ]}
            />
          </Field>
        </div>
        <Field label="Content">
          <Select
            value={messageId}
            onChange={(e) => setMessageId(e.target.value)}
            options={[
              { v: "", l: "Write a one-off message" },
              ...ready.map((m) => ({ v: m.id, l: `Saved · ${m.name}` })),
            ]}
          />
        </Field>
        {saved ? (
          <div className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white/70 px-3 py-2">
            {saved.image && (
              <img
                src={saved.image.src}
                alt=""
                className="w-14 aspect-[2/1] rounded-md object-cover"
              />
            )}
            <div className="min-w-0 flex-1 text-[12.5px]">
              <b className="text-navy-900">{saved.name}</b>
              <div className="text-slate-500 truncate">{saved.content.en.subject}</div>
            </div>
            {saved.promoCode && <Badge tone="amber">{saved.promoCode}</Badge>}
          </div>
        ) : (
          <>
            <Field label="Promote a loyalty offer">
              <Select
                value={offerId}
                onChange={(e) => {
                  const o = offers.find((x) => x.id === e.target.value);
                  setOfferId(e.target.value);
                  if (o)
                    setText(
                      `🎁 ${o.title} — ${o.summary}. Tap to claim your reward at Akti tou Iliou!`,
                    );
                }}
                options={[
                  { v: "", l: offers.length ? "None" : "No active schemes yet" },
                  ...offers.map((o) => ({ v: o.id, l: o.title })),
                ]}
              />
            </Field>
            {!offers.length && (
              <button
                type="button"
                onClick={() => go("admin", "loyalty")}
                className="text-[12px] font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1"
              >
                <Icon.gift size={12} /> Set up loyalty schemes →
              </button>
            )}
            <Field label="Message">
              <textarea
                aria-label="Message"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/70 outline-none"
              />
            </Field>
          </>
        )}
        <fieldset>
          <legend className="text-[12px] font-semibold text-slate-700 mb-1">Channel</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CH_ORDER.map((c) => {
              const CIcon = CH_ICON[c];
              const ok = chOptions.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!ok}
                  title={ok ? undefined : "This saved message has no variant for this channel"}
                  onClick={() => setChannel(c)}
                  aria-pressed={channel === c}
                  className={`relative rounded-xl p-2.5 text-center ring-1 transition disabled:opacity-40 disabled:cursor-not-allowed ${channel === c ? "ring-2 ring-teal-500 bg-teal-50/50" : "ring-slate-200 bg-white hover:ring-teal-400"}`}
                >
                  <span
                    className={`absolute top-2 right-2 w-2 h-2 rounded-full ${channels[c].connected ? "bg-teal-500" : "bg-slate-300"}`}
                    aria-label={channels[c].connected ? "Connected" : "Not connected"}
                  />
                  <span
                    className="mx-auto mb-1.5 w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm"
                    style={{ background: CH_COLOR[c] }}
                  >
                    <CIcon size={16} />
                  </span>
                  <div className="text-[12.5px] font-semibold text-navy-900">{CH_LABEL[c]}</div>
                </button>
              );
            })}
          </div>
        </fieldset>
        {!connected && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-800">
            <span className="inline-flex items-center gap-1.5">
              <Icon.alert size={13} /> {CH_LABEL[channel]} isn't connected yet — set it up to send
              on this channel.
            </span>
            <button
              type="button"
              onClick={onSetupChannel}
              className="font-semibold text-amber-900 hover:underline shrink-0"
            >
              Set up →
            </button>
          </div>
        )}
        <fieldset className="rounded-2xl ring-1 ring-slate-200 bg-white/70 p-3 space-y-3">
          <legend className="sr-only">Delivery</legend>
          <div
            role="radiogroup"
            aria-label="Delivery"
            className="inline-flex rounded-xl ring-1 ring-slate-200 bg-white p-0.5 text-[12.5px] font-semibold"
          >
            {(
              [
                ["now", "Send now"],
                ["once", "Schedule"],
                ["weekly", "Recurring"],
              ] as [When, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={when === k}
                onClick={() => setWhen(k)}
                className={`px-3 py-1 rounded-lg ${when === k ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {when === "once" && (
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              <Field label="Date">
                <DateInput
                  
                  value={onceDate}
                  min={today}
                  onChange={(v) => setOnceDate(v)}
                />
              </Field>
              <Field label="Time (Europe/Athens)">
                <Input type="time" value={onceTime} onChange={(e) => setOnceTime(e.target.value)} />
              </Field>
            </div>
          )}
          {when === "weekly" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Field label="Every">
                <Select
                  value={String(wk.weekday)}
                  onChange={(e) => setWk({ ...wk, weekday: Number(e.target.value) })}
                  options={WEEKDAYS.map((d, i) => ({ v: String(i), l: d }))}
                />
              </Field>
              <Field label="At">
                <Input
                  type="time"
                  value={wk.time}
                  onChange={(e) => setWk({ ...wk, time: e.target.value })}
                />
              </Field>
              <Field label="From">
                <DateInput
                  
                  value={wk.from}
                  onChange={(v) => setWk({ ...wk, from: v })}
                />
              </Field>
              <Field label="Until">
                <DateInput
                  
                  value={wk.to}
                  onChange={(v) => setWk({ ...wk, to: v })}
                />
              </Field>
            </div>
          )}
          {when === "weekly" && (
            <div className="text-[12px] text-slate-600">
              {occurrences(schedule).filter((a) => a > comms.clock).length} sends · each gets its
              own results.
            </div>
          )}
          {shift?.shifted && (
            <div className="flex items-start gap-1.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-800">
              <Icon.moon size={13} className="shrink-0 mt-0.5" /> Falls in quiet hours (
              {comms.settings.quiet.from}–{comms.settings.quiet.to}) — {CH_LABEL[channel]} will go
              out {fmtAt(shift.at)} instead.
            </div>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12.5px] text-slate-600">
            Reachable now: <b className="text-navy-900 tnum">{reach}</b> of {members.length} in{" "}
            {sName} · with {CH_LABEL[channel]} consent
          </div>
          <Btn
            variant="primary"
            icon={when === "now" ? Icon.send : Icon.calendar}
            disabled={errors.length > 0}
            title={errors[0] || undefined}
            onClick={() => setReview(true)}
          >
            {when === "now" ? "Review & send" : "Review & schedule"}
          </Btn>
        </div>
        {errors.length > 0 && (
          <div className="text-[12px] text-slate-500 text-right -mt-2">{errors[0]}</div>
        )}
      </Card>
      <aside className="space-y-2 lg:sticky lg:top-24 h-max">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 px-1">
          Preview · {CH_LABEL[channel]}
        </div>
        <ChannelPreview
          m={{ ...msg, channels: [channel] }}
          ch={channel}
          onCta={
            offer
              ? () => {
                  go("customer", "home");
                  toast("Opening the customer view — the reward is waiting on their home.", {
                    tone: "success",
                  });
                }
              : undefined
          }
        />
      </aside>
      <Modal
        open={review}
        onClose={() => setReview(false)}
        title={when === "now" ? "Review campaign" : "Review schedule"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setReview(false)}>
              Back
            </Btn>
            <Btn variant="primary" icon={when === "now" ? Icon.send : Icon.check} onClick={create}>
              {when === "now"
                ? shift?.shifted
                  ? "Queue for " + shift.at.slice(11)
                  : `Send to ${reach} guests`
                : "Schedule campaign"}
            </Btn>
          </>
        }
      >
        <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
          <dt className="text-slate-500">Audience</dt>
          <dd className="font-semibold text-navy-900">
            {sName} · {reach} reachable now
          </dd>
          <dt className="text-slate-500">Channel</dt>
          <dd className="font-semibold text-navy-900">{CH_LABEL[channel]}</dd>
          <dt className="text-slate-500">Content</dt>
          <dd className="font-semibold text-navy-900">
            {saved ? saved.name : "One-off message"}
            {offer ? ` · ${offer.title}` : ""}
          </dd>
          <dt className="text-slate-500">When</dt>
          <dd className="font-semibold text-navy-900">
            {when === "now"
              ? shift?.shifted
                ? fmtAt(shift.at)
                : "Immediately"
              : scheduleLabel(schedule)}
          </dd>
          <dt className="text-slate-500">Guardrails</dt>
          <dd className="text-slate-600">
            Consent checked per guest · max {comms.settings.cap.max} promotions per{" "}
            {comms.settings.cap.days} days
            {comms.settings.excludeOpenRefunds ? " · open refunds skipped" : ""}
            {comms.settings.quiet.on
              ? ` · quiet ${comms.settings.quiet.from}–${comms.settings.quiet.to}`
              : ""}
          </dd>
        </dl>
      </Modal>
    </div>
  );
}
