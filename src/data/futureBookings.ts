// Advance bookings on specific sets (sample data) — what the layout publish
// check (AENR-514) protects when a set is removed or moved.

export interface FutureBooking {
  id: string;
  zoneId: string;
  setId: string;
  date: string;
  guest: string;
  guests: number;
}

export const FUTURE_BOOKINGS: FutureBooking[] = [
  {
    id: "#BK-20311",
    zoneId: "central",
    setId: "CE-05",
    date: "2027-06-05",
    guest: "Elena Vlachos",
    guests: 2,
  },
  {
    id: "#BK-20342",
    zoneId: "central",
    setId: "CE-05",
    date: "2027-06-12",
    guest: "Nikos Papas",
    guests: 3,
  },
  {
    id: "#BK-20355",
    zoneId: "central",
    setId: "CE-14",
    date: "2027-06-20",
    guest: "Maria Kontou",
    guests: 2,
  },
  {
    id: "#BK-20367",
    zoneId: "macaw",
    setId: "MC-02",
    date: "2027-06-06",
    guest: "Giorgos Tsouris",
    guests: 2,
  },
  {
    id: "#BK-20380",
    zoneId: "akanthus",
    setId: "AK-10",
    date: "2027-07-03",
    guest: "Katerina Ioannou",
    guests: 4,
  },
];
