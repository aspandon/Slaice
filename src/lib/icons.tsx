// Icon set — backed by lucide-react, exposed through the app's stable
// `Icon.<name>` API so call sites never change. Each entry is a thin wrapper
// that maps our historic props (size, className, plus the legacy `sw` stroke
// width) onto the lucide component, keeping a consistent 1.75 stroke and
// crisp absolute stroke width across sizes.
import {
  Umbrella, Ticket, ReceiptText, CreditCard, Car, BarChart3, LayoutGrid,
  Users, Map, ScanLine, RotateCcw, Building2, Banknote, Lock, Home, Calendar,
  Download, Check, CheckCircle2, X, ChevronRight, ChevronDown, ArrowLeft,
  ArrowRight, Bell, Search, Globe, Tag, FileText, Settings, Zap, Package,
  TrendingUp, Phone, Mail, QrCode, Printer, Star, Filter, Plus, Minus, Trash2,
  Pencil, Play, List, Layers, Martini, MessageCircle, Gift, Shield, Eye, EyeOff, Sun,
  Info, TriangleAlert, Clock, Inbox, Droplet, Waves, Wind, Plus as CrossPlus,
  UsersRound, ShieldCheck, ShieldAlert, FileDown, Database, SlidersHorizontal,
  Sparkles, CircleHelp, Wallet, LogOut, Moon, Armchair, Image as ImageIcon, Upload,
  Cloud, CloudRain,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import type { ReactElement } from "react";

// Our icon props: lucide's, plus the legacy `sw` (stroke width) alias.
type IconProps = LucideProps & { sw?: number };
export type IconRenderer = (props: IconProps) => ReactElement;

// Wrap a lucide component so it accepts our { size, className, sw } props.
const w =
  (L: LucideIcon): IconRenderer =>
  ({ size = 18, className = "", sw = 1.75, ...rest }) => (
    <L size={size} className={className} strokeWidth={sw} absoluteStrokeWidth {...rest} />
  );

// Typed as a string-indexed record so dynamic lookups (Icon[item.icon]) stay
// valid once call sites are TypeScript.
export const Icon: Record<string, IconRenderer> = {
  // — core / navigation —
  umbrella: w(Umbrella),
  ticket: w(Ticket),
  receipt: w(ReceiptText),
  card: w(CreditCard),
  car: w(Car),
  chart: w(BarChart3),
  grid: w(LayoutGrid),
  users: w(Users),
  map: w(Map),
  scan: w(ScanLine),
  refund: w(RotateCcw),
  building: w(Building2),
  cash: w(Banknote),
  lock: w(Lock),
  home: w(Home),
  calendar: w(Calendar),
  download: w(Download),
  check: w(Check),
  checkCircle: w(CheckCircle2),
  x: w(X),
  chevR: w(ChevronRight),
  chevD: w(ChevronDown),
  arrowL: w(ArrowLeft),
  arrowR: w(ArrowRight),
  bell: w(Bell),
  search: w(Search),
  globe: w(Globe),
  tag: w(Tag),
  doc: w(FileText),
  cog: w(Settings),
  bolt: w(Zap),
  pkg: w(Package),
  trend: w(TrendingUp),
  phone: w(Phone),
  mail: w(Mail),
  qr: w(QrCode),
  print: w(Printer),
  star: w(Star),
  filter: w(Filter),
  plus: w(Plus),
  minus: w(Minus),
  trash: w(Trash2),
  edit: w(Pencil),
  play: w(Play),
  list: w(List),
  layers: w(Layers),
  stripe: w(CreditCard),
  seat: w(Armchair),
  chat: w(MessageCircle),
  gift: w(Gift),
  shield: w(Shield),
  eye: w(Eye),
  eyeOff: w(EyeOff),
  sun: w(Sun),
  info: w(Info),
  alert: w(TriangleAlert),
  clock: w(Clock),
  inbox: w(Inbox),
  // — beach facilities —
  drop: w(Droplet),
  glass: w(Martini),
  wave: w(Waves),
  wind: w(Wind),
  cloud: w(Cloud),
  rain: w(CloudRain),
  cross: w(CrossPlus),
  group: w(UsersRound),
  // — new (GDPR / reporting / chrome) —
  shieldCheck: w(ShieldCheck),
  shieldAlert: w(ShieldAlert),
  fileDown: w(FileDown),
  database: w(Database),
  sliders: w(SlidersHorizontal),
  sparkles: w(Sparkles),
  help: w(CircleHelp),
  wallet: w(Wallet),
  logout: w(LogOut),
  moon: w(Moon),
  image: w(ImageIcon),
  upload: w(Upload),
};
