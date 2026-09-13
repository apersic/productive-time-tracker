import type { Copy } from "./en.ts";
import { createFormatters } from "./formatters.ts";
import type { CalendarDay } from "../time/calendar-day.ts";

const fmt = createFormatters("hr", ["one", "few", "other"] as const);

export const hr: Copy = {
  dayLabel: (day: CalendarDay) => fmt.dayLabel(day),

  language: {
    pickerLabel: "Jezik",
  },

  page: {
    login: "Prijava",
    home: "Početna",
    editEntry: "Uredi unos vremena",
  },

  document: {
    skipToContent: "Preskoči na sadržaj",
    loading: "Učitavanje…",
  },

  login: {
    intro: "Unesite Productive API token i ID organizacije.",
    organizationLabel: "ID organizacije",
    organizationPlaceholder: "12345…",
    tokenLabel: "API token",
    tokenPlaceholder: "Zalijepite token…",
    showToken: "Prikaži token",
    hideToken: "Sakrij token",
    missingFields: "Unesite API token i ID organizacije.",
    submit: "Prijava",
    loading: "Učitavanje…",
  },

  header: {
    logOut: "Odjava",
  },

  home: {
    listLoading: (day) => `Učitavanje unosa vremena za ${fmt.dayLabel(day)}`,
    listEmpty: (day) => `Nema evidentiranog vremena za ${fmt.dayLabel(day)}`,
    listReady: (args) =>
      `${fmt.plural(args.count, {
        one: `${fmt.count(args.count)} unos vremena`,
        few: `${fmt.count(args.count)} unosa vremena`,
        other: `${fmt.count(args.count)} unosa vremena`,
      })} za ${fmt.dayLabel(args.day)}`,
    emptyHeading: (day) => `Nema evidentiranog vremena za ${fmt.dayLabel(day)}`,
    emptyHint: "Dodajte unos vremena da započnete ovaj dan.",
    copyPreviousDay: "Kopiraj zadatke s prethodnog dana",
    loadingEntries: "Učitavanje unosa vremena",
    loadingMore: "Učitavanje još unosa",
    newEntry: "Novi unos vremena",
    createNav: "Stvori unos vremena",
    region: "Unosi vremena",
    regionFor: (day) => `Unosi vremena za ${fmt.dayLabel(day)}`,
    moreActions: (title) => `Više radnji za ${title}`,
    edit: "Uredi",
    delete: "Izbriši",
    deleteTitle: "Izbrisati ovaj unos vremena?",
    deleteConfirm: "Izbriši unos",
    cancel: "Odustani",
    retry: "Pokušaj ponovno",
    startTimer: (title) => `Pokreni mjerač za ${title}`,
    stopTimer: (title) => `Zaustavi mjerač za ${title}`,
  },

  form: {
    date: "Datum",
    day: "Dan",
    duration: "Trajanje",
    description: "Opis",
    durationHint: "Minute ili hh:mm, npr. 90 ili 1:30",
    durationPlaceholder: "Vrijeme",
    notePlaceholder: "Unesite opis",
    noteHelper: "Unesite opis",
    previousDay: "Prethodni dan",
    today: "Danas",
    nextDay: "Sljedeći dan",
    openCalendar: "Otvori kalendar",
    fixHighlighted: "Ispravite označena polja.",
    loadingServices: "Učitavanje usluga",
    loadingEntries: "Učitavanje unosa vremena",
    addEntry: "Dodaj unos",
    close: "Zatvori",
    noTrackableServices: "Nema usluga dostupnih za evidenciju vremena.",
  },

  service: {
    label: "Usluga",
    select: "Odaberite uslugu",
    search: "Traži usluge",
    current: "Trenutna usluga",
    loading: "Učitavanje usluga",
    none: "Nema usluga",
    noMatches: "Nema odgovarajućih usluga",
  },

  edit: {
    save: "Spremi promjene",
    notFound: "Taj unos vremena nije pronađen.",
    backHome: "Natrag na početnu",
    discardTitle: "Odbaciti nespremljene promjene?",
    discardBody: "Izmijene će se izgubiti ako napustite ovu stranicu.",
    keepEditing: "Nastavi uređivati",
    discard: "Odbaci",
    loading: "Učitavanje unosa vremena",
  },

  notice: {
    entryCreated: "Unos vremena dodan",
    dayCopied: (from) => `Kopirani su unosi od ${fmt.dayLabel(from)}`,
    dayCopiedPartial: (from) =>
      `Kopirani su neki unosi od ${fmt.dayLabel(from)}`,
    dayCopiedPartialDetail: "Productive je odbio ostale.",
    timerFailed: "Mjerač vremena nije ažuriran",
    recoverTimerFailed: "Mjerač vremena nije osvježen",
    entryDeleted: "Unos vremena izbrisan",
    entryDeleteFailed: "Unos vremena nije izbrisan",
    entryUpdated: "Unos vremena ažuriran",
    entryUpdateFailed: "Unos vremena nije ažuriran",
    copyDayFailed: "Prethodni dan nije kopiran",
    sessionExpired: "Sesija je istekla. Prijavite se ponovno.",
  },

  fieldIssue: {
    blank: "Ne može biti prazno",
    tooLong: "Mora biti manje od 24 sata",
  },

  failure: {
    unreachable: "Productive nije dostupan.",
    badCredentials: "Neispravan token ili ID organizacije.",
    sessionRejected: "Vaša sesija više nije važeća.",
    requestRejected: "Productive je odbio zahtjev.",
    badResponse: "Productive je vratio neispravan odgovor.",
    manyUsers: "Productive je vratio više od jednog korisnika.",
    noUser: "Trenutni korisnik nije učitan.",
    noUserEmail: "Trenutni korisnik nema e-poštu.",
    manyPeople: "Productive je vratio više od jedne osobe.",
    noPerson: "Trenutna osoba nije učitana.",
    badTimeEntry: "Productive je vratio neispravan unos vremena.",
    badTimer: "Productive je vratio neispravan mjerač vremena.",
    timerAlreadyStopped: "Ovaj mjerač vremena je već zaustavljen.",
    entryNotUpdatable: "Ovaj unos vremena nije moguće ažurirati.",
    entryGone: "Ovaj unos vremena više ne postoji.",
    entryNotDeletable: "Ovaj unos vremena nije moguće izbrisati.",
    dayStillLoading: "Pričekajte da se dan učita.",
    dayChangedWhileSaving: "Dan se promijenio dok se unos spremao.",
    dayChangedWhileDeleting: "Dan se promijenio dok se unos brisao.",
  },
};
