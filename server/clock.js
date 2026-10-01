// Heure de Paris : c'est le serveur qui décide de ce qui est débloqué (pas l'horloge du PC des joueurs).
const TZ = "Europe/Paris";
const YEAR = 2026;
const MONTH = 10;

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric", month: "numeric", day: "numeric",
  hour: "numeric", minute: "numeric", second: "numeric",
  hourCycle: "h23",
});

function parisNow() {
  const parts = {};
  for (const p of fmt.formatToParts(new Date())) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  // Pour tester un autre jour : FAKE_DATE=2026-10-15
  if (process.env.FAKE_DATE) {
    const [year, month, day] = process.env.FAKE_DATE.split("-").map(Number);
    Object.assign(parts, { year, month, day });
  }
  return parts;
}

function unlockedDays() {
  const p = parisNow();
  if (p.year > YEAR || (p.year === YEAR && p.month > MONTH)) return 31;
  if (p.year === YEAR && p.month === MONTH) return p.day;
  return 0;
}

function dayInfo() {
  const p = parisNow();
  return {
    unlocked: unlockedDays(),
    today: p.year === YEAR && p.month === MONTH ? p.day : 0,
    secondsToMidnight: 86400 - (p.hour * 3600 + p.minute * 60 + p.second),
  };
}

module.exports = { unlockedDays, dayInfo };
