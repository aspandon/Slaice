// Communicate → channel connections. Metadata for the setup wizard (providers,
// steps, the credential/sender fields) plus the seeded connection state. Push is
// in-app and connected out of the box; Email / Viber / SMS need a provider.
import type { ChannelKey, ChannelSetupState } from "../domain/types";

export interface ChannelMeta {
  key: ChannelKey;
  label: string;
  /** Icon key in lib/icons. */
  icon: string;
  color: string;
  blurb: string;
  /** Whether the admin needs to connect a provider (false for in-app push). */
  setup: boolean;
  providers: string[];
  credLabel: string;
  senderLabel: string;
  senderPlaceholder: string;
  /** Verification steps shown while connecting. */
  steps: string[];
}

export const CHANNELS: ChannelMeta[] = [
  {
    key: "push", label: "Push", icon: "bell", color: "#3a47cc", setup: false,
    blurb: "In-app notifications to guests who installed the app — no setup needed.",
    providers: ["In-app"], credLabel: "", senderLabel: "", senderPlaceholder: "", steps: [],
  },
  {
    key: "email", label: "E-mail", icon: "mail", color: "#0d9488", setup: true,
    blurb: "Transactional + marketing e-mail through your provider.",
    providers: ["SendGrid", "Mailgun", "Postmark", "Amazon SES", "Custom SMTP"],
    credLabel: "API key", senderLabel: "From address", senderPlaceholder: "hello@aktitouiliou.gr",
    steps: ["Authenticating with the provider", "Verifying sender domain (SPF + DKIM)", "Registering the from-address", "Sending a test e-mail"],
  },
  {
    key: "viber", label: "Viber", icon: "chat", color: "#7360f2", setup: true,
    blurb: "Viber Business messages to opted-in guests.",
    providers: ["Viber Business Messages", "Vonage", "Infobip"],
    credLabel: "API token", senderLabel: "Sender name", senderPlaceholder: "Akti tou Iliou",
    steps: ["Authenticating the business account", "Registering the sender name", "Awaiting Viber approval", "Sending a test message"],
  },
  {
    key: "sms", label: "SMS", icon: "phone", color: "#16a34a", setup: true,
    blurb: "SMS to any mobile, billed per message by your gateway.",
    providers: ["Twilio", "Vonage", "Apifon (GR)", "Infobip"],
    credLabel: "API key", senderLabel: "Sender ID", senderPlaceholder: "AKTI",
    steps: ["Authenticating with the gateway", "Registering the alphanumeric sender ID", "Checking local sender regulations", "Sending a test SMS"],
  },
];

export const channelMeta = (key: ChannelKey): ChannelMeta => CHANNELS.find((c) => c.key === key) ?? CHANNELS[0];

export const DEFAULT_CHANNELS: ChannelSetupState = {
  push: { connected: true, provider: "In-app", sender: "Akti tou Iliou" },
  email: { connected: false },
  viber: { connected: false },
  sms: { connected: false },
};
