import { Btn, Card } from "../../components/ui";
import { Icon } from "../../lib/icons";
import { DEFAULT_EXTRAS } from "../../domain/extras";
import { TicketCategoryEditor, TicketsAdmin, newTicketCat } from "../beach/Extras";
import { SectionFrame, useTenantDraft, type SectionProps } from "./kit";

/* ============ Entry tickets per tenant (AENR-711) ============
   Slaice sets which entry-ticket categories a beach sells — name, short label,
   short description, price, on sale, order. For the demo beach this is the very
   list its manager edits in Products › Entry tickets (the app store), so changes
   reach the booking wizard and the till at once; other tenants keep theirs on the
   tenant record. */
export function EntryTickets({ t }: SectionProps) {
  const live = t.id === "akti";
  if (live)
    return (
      <SectionFrame
        title="Entry tickets"
        sub={`The ticket categories ${t.name}'s guests see — shared with the beach's own Products › Entry tickets, so a change here is live in the booking wizard and the till.`}
      >
        <TicketsAdmin />
      </SectionFrame>
    );
  return <TenantTickets t={t} />;
}

function TenantTickets({ t }: { t: SectionProps["t"] }) {
  const d = useTenantDraft(t, ["ticketCats"] as const, "Entry tickets");
  const list = d.draft.ticketCats ?? DEFAULT_EXTRAS.tickets;
  const invalid = list.some((x) => !x.name.trim() || !x.short.trim() || !(x.price >= 0));
  return (
    <SectionFrame
      title="Entry tickets"
      sub={`The ticket categories ${t.name}'s guests see when booking and at the till.`}
      actions={
        <Btn
          variant="outline"
          icon={Icon.plus}
          onClick={() => d.set("ticketCats", [...list, newTicketCat(list)])}
        >
          Add category
        </Btn>
      }
    >
      <Card className="p-4 space-y-3">
        <TicketCategoryEditor tickets={list} onChange={(next) => d.set("ticketCats", next)} />
        {invalid && (
          <p role="alert" className="text-[12.5px] text-rose-700">
            Every category needs a name, a short label and a price of €0 or more.
          </p>
        )}
        <p className="text-[12px] text-slate-500">
          Switched-off or removed categories disappear for guests and staff; past sales keep their
          label. Prices by period and weekday / weekend are set by the beach in Products › Entry
          tickets.
        </p>
      </Card>
      {!invalid && d.bar}
      {d.reasonModal}
    </SectionFrame>
  );
}
