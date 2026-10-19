const UNITS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
const ALIASES = {
  ms: "ms", msec: "ms", millisecond: "ms", milliseconds: "ms",
  s: "s", sec: "s", secs: "s", second: "s", seconds: "s", seconde: "s", seconden: "s",
  m: "m", min: "m", mins: "m", minute: "m", minutes: "m", minuut: "m", minuten: "m",
  h: "h", hr: "h", hrs: "h", hour: "h", hours: "h", u: "h", uur: "h", uren: "h",
  d: "d", day: "d", days: "d", dag: "d", dagen: "d",
  w: "w", wk: "w", week: "w", weeks: "w", weken: "w"
};

/**
 * Reads a duration into milliseconds: `"1h30m"`, `"90 min"`, `"1.5h"`, `"2d 4u"`, `"250ms"`, `"1 week"`; Dutch units work too
 * (`uur`, `minuten`, `dagen`). A bare number is milliseconds. Throws on anything it cannot read, so a typo in a config does not
 * silently become 0.
 */
export function parseDuration(input) {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) throw new RangeError("duration: a number must be finite and not negative");
    return input;
  }
  if (typeof input !== "string") throw new TypeError("duration: expected a string or a number");
  const text = input.trim().toLowerCase();
  if (text === "") throw new SyntaxError("duration: empty");
  if (/^\d+(\.\d+)?$/.test(text)) return safe(Math.round(Number(text)), input);
  const part = /(\d+(?:\.\d+)?)\s*([a-z]+)/y;
  let total = 0;
  let index = 0;
  while (index < text.length) {
    part.lastIndex = index;
    const match = part.exec(text);
    if (!match) throw new SyntaxError(`duration: cannot read "${input}"`);
    const unit = Object.hasOwn(ALIASES, match[2]) ? ALIASES[match[2]] : undefined; // not "constructor"
    if (!unit) throw new SyntaxError(`duration: unknown unit "${match[2]}" in "${input}"`);
    total += Number(match[1]) * UNITS[unit];
    index = part.lastIndex;
    while (text[index] === " " || text[index] === ",") index++;
  }
  return safe(Math.round(total), input);
}

// Beyond 2^53 milliseconds (about 285 000 years) numbers are no longer exact, so that is an error, not a silently wrong result.
function safe(ms, input) {
  if (!Number.isSafeInteger(ms)) throw new RangeError(`duration: "${input}" is too large`);
  return ms;
}

const CLOCK = [["d", 86_400], ["h", 3600], ["m", 60], ["s", 1]];

/** Compact form: `formatDuration(5_400_000)` is `"1h 30m"`. At most `maxUnits` units are shown (default 3) and the rest is rounded: `{ maxUnits: 1 }` gives `"2h"`. */
export function formatDuration(ms, { maxUnits = 3 } = {}) {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError("duration: expected a finite, non-negative number of milliseconds");
  if (!Number.isInteger(maxUnits) || maxUnits < 1) throw new RangeError("duration: maxUnits must be a whole number of at least 1");
  ms = Math.round(ms); // 999.6 is 1 second, not "1000ms"
  if (ms < 1000) return `${ms}ms`;
  let seconds = Math.round(ms / 1000);
  const first = CLOCK.findIndex(([, size]) => seconds >= size);
  const last = Math.min(first + maxUnits - 1, CLOCK.length - 1);
  const step = CLOCK[last][1];
  seconds = Math.round(seconds / step) * step;
  const out = [];
  for (const [unit, size] of CLOCK) {
    const n = Math.floor(seconds / size);
    if (n > 0) out.push(`${n}${unit}`);
    seconds -= n * size;
  }
  return out.join(" ");
}

/** ISO 8601 durations as used in APIs and calendars: `"PT1H30M"`, `"P1DT12H"`, `"P2W"`. Years and months are refused: they have no fixed length. */
export function parseIso(input) {
  const match = /^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(typeof input === "string" ? input.trim() : "");
  if (!match || match.slice(1).every((v) => v === undefined) || /T$/i.test(input.trim())) {
    if (/^P.*[YM]/i.test(String(input).split("T")[0] ?? "")) throw new SyntaxError("duration: years and months have no fixed length; use days");
    throw new SyntaxError(`duration: "${input}" is not an ISO 8601 duration`);
  }
  const [, w, d, h, m, s] = match.map((v) => (v === undefined ? 0 : Number(v)));
  return safe(Math.round(w * UNITS.w + d * UNITS.d + h * UNITS.h + m * UNITS.m + s * UNITS.s), input);
}

/** `toIso(5_400_000)` is `"PT1H30M"`. */
export function toIso(ms) {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError("duration: expected a finite, non-negative number of milliseconds");
  let rest = Math.round(ms); // whole milliseconds, so 59 999.6 ms is "PT1M", not "PT60S"
  const d = Math.floor(rest / 86_400_000);
  rest -= d * 86_400_000;
  const h = Math.floor(rest / 3_600_000);
  rest -= h * 3_600_000;
  const m = Math.floor(rest / 60_000);
  rest -= m * 60_000;
  const seconds = rest / 1000;
  const date = d ? `${d}D` : "";
  const time = `${h ? `${h}H` : ""}${m ? `${m}M` : ""}${seconds ? `${seconds}S` : ""}`;
  return time ? `P${date}T${time}` : date ? `P${date}` : "PT0S";
}
