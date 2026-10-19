import { useEffect, useState } from "react";
import { Icon } from "../../lib/icons";
import {
  Btn,
  Card,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Stepper,
  Toggle,
} from "../../components/ui";
import { useApp } from "../../app/store";
import { CHANNELS, channelMeta } from "../../data/channels";
import type { ChannelConnection, ChannelKey, ChannelSetupState } from "../../domain/types";
import { inQuiet } from "../../domain/comms";

/* ============ Channels & rules ============
   Provider connections (moved here from the old single Communicate screen)
   plus the delivery guardrails every campaign and automation shares
   (AENR-492): quiet hours, the frequency cap and the open-refund exclusion. */

/* ---- Channel connection wizard: provider → credentials → verify → connected ---- */
function ChannelSetupModal({
  channelKey,
  current,
  onClose,
  onConnect,
  onDisconnect,
}: {
  channelKey: ChannelKey | null;
  current?: ChannelConnection;
  onClose: () => void;
  onConnect: (key: ChannelKey, conn: { provider: string; sender: string }) => void;
  onDisconnect: (key: ChannelKey) => void;
}) {
  const meta = channelKey ? channelMeta(channelKey) : null;
  const [provider, setProvider] = useState("");
  const [cred, setCred] = useState("");
  const [sender, setSender] = useState("");
  const [stage, setStage] = useState<"form" | "connecting" | "done">("form");
  const [step, setStep] = useState(0);
  // Re-seed whenever a channel opens.
  useEffect(() => {
    if (!channelKey || !meta) return;
    setProvider(current?.provider ?? meta.providers[0]);
    setSender(current?.sender ?? "");
    setCred("");
    setStage("form");
    setStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey]);
  // Walk the verify steps, then land on done.
  useEffect(() => {
    if (stage !== "connecting" || !meta) return;
    if (step < meta.steps.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 720);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStage("done"), 450);
    return () => clearTimeout(t);
  }, [stage, step, meta]);

  const canConnect = !!provider && cred.trim().length > 0 && sender.trim().length > 0;
  const finish = () => {
    if (channelKey) onConnect(channelKey, { provider, sender: sender.trim() });
    onClose();
  };

  return (
    <Modal
      open={channelKey !== null}
      onClose={onClose}
      title={
        meta
          ? current?.connected
            ? `Manage ${meta.label}`
            : `Set up ${meta.label}`
          : "Set up channel"
      }
      footer={
        !meta ? undefined : stage === "form" ? (
          <div className="flex items-center justify-between w-full gap-2">
            {current?.connected ? (
              <Btn
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50"
                icon={Icon.trash}
                onClick={() => {
                  onDisconnect(channelKey as ChannelKey);
                  onClose();
                }}
              >
                Disconnect
              </Btn>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={onClose}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                icon={Icon.bolt}
                disabled={!canConnect}
                onClick={() => {
                  setStep(0);
                  setStage("connecting");
                }}
              >
                Connect &amp; verify
              </Btn>
            </div>
          </div>
        ) : stage === "done" ? (
          <Btn variant="primary" icon={Icon.check} onClick={finish}>
            Done
          </Btn>
        ) : undefined
      }
    >
      {meta && (
        <div className="space-y-3">
          {stage === "form" && (
            <>
              <div className="text-[12.5px] text-slate-600 -mt-1">{meta.blurb}</div>
              <Field label="Provider">
                <Select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  options={meta.providers}
                />
              </Field>
              <Field label={meta.credLabel}>
                <Input
                  type="password"
                  value={cred}
                  onChange={(e) => setCred(e.target.value)}
                  placeholder={`Paste your ${provider} ${meta.credLabel.toLowerCase()}`}
                />
              </Field>
              <Field label={meta.senderLabel}>
                <Input
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder={meta.senderPlaceholder}
                />
              </Field>
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2 text-[11.5px] text-slate-500 flex items-start gap-1.5">
                <Icon.lock size={13} className="shrink-0 mt-0.5 text-slate-500" /> Demo — keys
                aren’t stored or sent anywhere. In production they’re held server-side and never
                reach the browser.
              </div>
            </>
          )}
          {stage === "connecting" && (
            <div className="py-1 space-y-2.5">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-navy-900">
                <Spinner size={14} /> Connecting {meta.label} via {provider}…
              </div>
              <div className="space-y-1.5">
                {meta.steps.map((s, i) => {
                  const st = i < step ? "done" : i === step ? "active" : "todo";
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 transition ${st === "done" ? "ring-teal-200 bg-teal-50/60" : st === "active" ? "ring-slate-200 bg-white shadow-soft" : "ring-slate-100 bg-slate-50/50 opacity-55"}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${st === "done" ? "bg-teal-600 text-white" : st === "active" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500"}`}
                      >
                        {st === "done" ? (
                          <Icon.check size={13} />
                        ) : st === "active" ? (
                          <Spinner size={12} />
                        ) : (
                          <Icon.clock size={12} />
                        )}
                      </span>
                      <span
                        className={`text-[13px] ${st === "todo" ? "text-slate-500" : "text-navy-900"}`}
                      >
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {stage === "done" && (
            <div className="py-2 text-center space-y-2 animate-pop">
              <span className="mx-auto w-12 h-12 rounded-full bg-teal-600 text-white grid place-items-center shadow">
                <Icon.check size={22} />
              </span>
              <div className="font-semibold text-navy-900">{meta.label} connected</div>
              <div className="text-[13px] text-slate-600 max-w-xs mx-auto">
                Sending as <b>{sender || meta.senderPlaceholder}</b> via <b>{provider}</b>.
                Campaigns can now go out on {meta.label}.
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---- Channel connections panel (the setup journey, demoed) ---- */
function ChannelConnections({
  channels,
  onSetup,
}: {
  channels: ChannelSetupState;
  onSetup: (k: ChannelKey) => void;
}) {
  return (
    <Card className="p-4 mb-5">
      <div className="min-w-0 mb-3">
        <div className="font-semibold text-navy-900">Channel connections</div>
        <div className="text-[12.5px] text-slate-500">
          Connect your Email, Viber and SMS providers so campaigns can actually send on those
          channels.
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CHANNELS.map((c) => {
          const conn = channels[c.key];
          const CIcon = Icon[c.icon] || Icon.bell;
          return (
            <div
              key={c.key}
              className={`rounded-2xl ring-1 p-3.5 flex flex-col ${conn.connected ? "ring-teal-200 bg-teal-50/40" : "ring-slate-200 bg-white"}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span
                  className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-sm shrink-0"
                  style={{ background: c.color }}
                >
                  <CIcon size={16} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900 text-[13.5px]">{c.label}</div>
                  {conn.connected ? (
                    <div className="text-[11px] text-teal-700 font-semibold inline-flex items-center gap-1">
                      <Icon.checkCircle size={11} /> Connected
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">Not connected</div>
                  )}
                </div>
              </div>
              <div className="text-[11.5px] text-slate-500 leading-snug flex-1">
                {conn.connected ? (
                  <>
                    via <b className="text-navy-900">{conn.provider}</b>
                    {conn.sender ? ` · ${conn.sender}` : ""}
                  </>
                ) : (
                  c.blurb
                )}
              </div>
              {c.setup ? (
                <Btn
                  size="sm"
                  variant={conn.connected ? "ghost" : "primary"}
                  className="mt-2.5"
                  icon={conn.connected ? Icon.cog : Icon.plus}
                  onClick={() => onSetup(c.key)}
                >
                  {conn.connected ? "Manage" : "Set up"}
                </Btn>
              ) : (
                <div className="mt-2.5 text-[11px] text-slate-500 inline-flex items-center gap-1">
                  <Icon.check size={11} className="text-teal-600" /> No setup needed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
export function ChannelsTab() {
  const { channels, setChannels, toast, comms, setComms } = useApp();
  const [setupKey, setSetupKey] = useState<ChannelKey | null>(null);
  const st = comms.settings;
  const set = (patch: Partial<typeof st>) =>
    setComms((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const connectChannel = (key: ChannelKey, conn: { provider: string; sender: string }) => {
    setChannels({
      ...channels,
      [key]: {
        connected: true,
        provider: conn.provider,
        sender: conn.sender,
        connectedAt: new Date().toISOString(),
      },
    });
    toast(`${channelMeta(key).label} connected via ${conn.provider}.`, { tone: "success" });
  };
  const disconnectChannel = (key: ChannelKey) => {
    setChannels({ ...channels, [key]: { connected: false } });
    toast(`${channelMeta(key).label} disconnected.`);
  };
  const nowTime = comms.clock.slice(11, 16);
  return (
    <div>
      <ChannelConnections channels={channels} onSetup={setSetupKey} />
      <Card className="p-4">
        <div className="font-semibold text-navy-900">Delivery rules</div>
        <div className="text-[12.5px] text-slate-500 mb-4">
          Apply to every campaign and automation, on every channel.
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Toggle
              label="Quiet hours"
              on={st.quiet.on}
              onChange={(on) => set({ quiet: { ...st.quiet, on } })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field label="From">
                <Input
                  type="time"
                  value={st.quiet.from}
                  disabled={!st.quiet.on}
                  onChange={(e) => set({ quiet: { ...st.quiet, from: e.target.value } })}
                />
              </Field>
              <Field label="Until">
                <Input
                  type="time"
                  value={st.quiet.to}
                  disabled={!st.quiet.on}
                  onChange={(e) => set({ quiet: { ...st.quiet, to: e.target.value } })}
                />
              </Field>
            </div>
            <div className="text-[11.5px] text-slate-500">
              No push, Viber or SMS in this window — sends move to {st.quiet.to}. E-mail is exempt.
              {st.quiet.on && inQuiet(nowTime, st.quiet) ? " Quiet hours are on right now." : ""}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[12px] font-semibold text-slate-700">Frequency cap per guest</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Max messages">
                <Stepper
                  value={st.cap.max}
                  min={1}
                  onChange={(max) => set({ cap: { ...st.cap, max } })}
                  label="Max promotional messages"
                />
              </Field>
              <Field label="Per days">
                <Select
                  value={String(st.cap.days)}
                  onChange={(e) => set({ cap: { ...st.cap, days: Number(e.target.value) } })}
                  options={[
                    { v: "1", l: "1 day" },
                    { v: "7", l: "7 days" },
                    { v: "14", l: "14 days" },
                    { v: "30", l: "30 days" },
                  ]}
                />
              </Field>
            </div>
            <div className="text-[11.5px] text-slate-500">
              Counts promotional messages from campaigns and automations together. Guests over the
              cap are skipped and the skip is logged.
            </div>
          </div>
          <div className="space-y-2">
            <Toggle
              label="Skip guests with an open refund or complaint"
              on={st.excludeOpenRefunds}
              onChange={(excludeOpenRefunds) => set({ excludeOpenRefunds })}
            />
            <div className="text-[11.5px] text-slate-500">
              Promotions wait until the refund is settled. Consent is always checked per channel —
              guests who didn't opt in are never sent promotions.
            </div>
          </div>
        </div>
      </Card>
      <ChannelSetupModal
        channelKey={setupKey}
        current={setupKey ? channels[setupKey] : undefined}
        onClose={() => setSetupKey(null)}
        onConnect={connectChannel}
        onDisconnect={disconnectChannel}
      />
    </div>
  );
}
