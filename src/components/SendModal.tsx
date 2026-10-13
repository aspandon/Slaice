import { useEffect, useState } from "react";
import { Icon, type IconRenderer } from "../lib/icons";
import { Btn, Modal } from "./ui";

/* ---- Shared send-channel picker — QR / offers via Email · Viber · SMS ---- */
export type SendChannel = "Email" | "Viber" | "SMS";
const SEND_CHANNELS: { key: SendChannel; icon: IconRenderer; color: string }[] = [
  { key: "Email", icon: Icon.mail, color: "#0d9488" },
  { key: "Viber", icon: Icon.chat, color: "#7360f2" },
  { key: "SMS", icon: Icon.phone, color: "#16a34a" },
];

export function SendModal({
  open,
  onClose,
  title,
  intro,
  email,
  phone,
  sendLabel = "Send",
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  intro?: string;
  email?: string;
  phone?: string;
  sendLabel?: string;
  onSend: (channel: SendChannel, dest: string) => void;
}) {
  const [channel, setChannel] = useState<SendChannel>("Email");
  useEffect(() => {
    if (open) setChannel("Email");
  }, [open]);
  const destOf = (c: SendChannel) => (c === "Email" ? email : phone) || "—";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={Icon.check}
            onClick={() => {
              onSend(channel, destOf(channel));
              onClose();
            }}
          >
            {sendLabel} via {channel}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        {intro && <p className="text-[13px] text-slate-600 -mt-1">{intro}</p>}
        <div className="grid grid-cols-3 gap-2">
          {SEND_CHANNELS.map((c) => {
            const CIcon = c.icon;
            const on = channel === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setChannel(c.key)}
                aria-pressed={on}
                className={`rounded-xl p-3 text-center ring-1 transition ${on ? "ring-2 ring-teal-500 bg-teal-50/50" : "ring-slate-200 bg-white hover:ring-teal-400"}`}
              >
                <span
                  className="mx-auto mb-1.5 w-10 h-10 rounded-xl grid place-items-center text-white shadow-sm"
                  style={{ background: c.color }}
                >
                  <CIcon size={18} />
                </span>
                <div className="text-[13px] font-semibold text-navy-900">{c.key}</div>
                <div className="text-[10.5px] text-slate-500 truncate">{destOf(c.key)}</div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
