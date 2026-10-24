import { useState } from "react";
import { Icon } from "../../lib/icons";
import { Badge, Btn, FutureBanner, PageHead, Tabs } from "../../components/ui";
import { useApp } from "../../app/store";
import { readHashQuery, writeHashQuery } from "../../app/router";
import { campaignStatus, fmtAt, pending } from "../../domain/comms";
import { ComposeTab } from "./Compose";
import { MessagesTab } from "./Messages";
import { CampaignsTab } from "./Campaigns";
import { AutomationsTab } from "./Automations";
import { ChannelsTab } from "./Channels";

/* ============ Communicate (A-10) ============
   Compose · Messages library (AENR-490) · Campaigns and Automations on one
   delivery model (AENR-492) · Channels & delivery rules. The tab lives in the
   URL (?tab=) so a view survives refresh. A demo clock drives scheduled sends. */

const TABS = ["compose", "messages", "campaigns", "automations", "channels"] as const;
type Tab = (typeof TABS)[number];

export function AdminCommunicate() {
  const { comms, setComms } = useApp();
  const initial = readHashQuery().get("tab");
  const [tab, setTabRaw] = useState<Tab>(
    TABS.includes(initial as Tab) ? (initial as Tab) : "compose",
  );
  const [preset, setPreset] = useState<string | undefined>();
  const setTab = (t: string) => {
    setTabRaw(t as Tab);
    writeHashQuery({ tab: t });
  };
  const scheduled = comms.campaigns.filter((c) =>
    ["Scheduled", "Sending"].includes(campaignStatus(c)),
  ).length;
  const active = comms.automations.filter((a) => a.status === "Active").length;
  const next = comms.campaigns
    .filter((c) => !c.paused && !c.cancelled)
    .flatMap(pending)
    .sort()[0];
  const advance = (mins: number) =>
    setComms((s) => {
      const d = new Date(`${s.clock}:00Z`);
      d.setUTCMinutes(d.getUTCMinutes() + mins);
      return { ...s, clock: d.toISOString().slice(0, 16) };
    });
  const jump = () => next && setComms((s) => ({ ...s, clock: next > s.clock ? next : s.clock }));
  return (
    <div className="animate-fade-up">
      <PageHead
        title="Communicate"
        sub="Messages, campaigns and automations to your guests — built on Users & Segments."
        badge={<Badge tone="future">Future</Badge>}
      />
      <FutureBanner />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl ring-1 ring-slate-200 bg-white/70 px-3 py-2 text-[12.5px]">
        <Icon.clock size={14} className="text-slate-500" />
        <span className="text-slate-600">Demo clock</span>
        <b className="text-navy-900 tnum" aria-live="polite">
          {fmtAt(comms.clock)}
        </b>
        <span className="text-slate-500 hidden sm:inline">· Europe/Athens</span>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          <Btn size="sm" variant="ghost" onClick={() => advance(60)}>
            +1 hour
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => advance(24 * 60)}>
            +1 day
          </Btn>
          <Btn
            size="sm"
            variant="ghost"
            icon={Icon.arrowR}
            disabled={!next}
            title={next ? undefined : "Nothing scheduled"}
            onClick={jump}
          >
            {next ? `Jump to next send · ${fmtAt(next)}` : "No sends scheduled"}
          </Btn>
        </div>
      </div>
      <div className="mb-4">
        <Tabs
          scroll
          value={tab}
          onChange={setTab}
          tabs={[
            ["compose", "Compose", Icon.send],
            [
              "messages",
              `Messages · ${comms.messages.filter((m) => !m.archived).length}`,
              Icon.mail,
            ],
            [
              "campaigns",
              `Campaigns${scheduled ? ` · ${scheduled} scheduled` : ""}`,
              Icon.calendar,
            ],
            ["automations", `Automations${active ? ` · ${active} active` : ""}`, Icon.bolt],
            ["channels", "Channels & rules", Icon.cog],
          ]}
        />
      </div>
      {tab === "compose" && (
        <ComposeTab
          presetMessage={preset}
          onDone={() => setTab("campaigns")}
          onSetupChannel={() => setTab("channels")}
        />
      )}
      {tab === "messages" && (
        <MessagesTab
          onUse={(id) => {
            setPreset(id);
            setTab("compose");
          }}
        />
      )}
      {tab === "campaigns" && <CampaignsTab onNew={() => setTab("compose")} />}
      {tab === "automations" && <AutomationsTab />}
      {tab === "channels" && <ChannelsTab />}
    </div>
  );
}
