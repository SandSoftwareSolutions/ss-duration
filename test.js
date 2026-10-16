import assert from "node:assert/strict";
import { test } from "node:test";

import { formatDuration, parseDuration, parseIso, toIso } from "./src/index.js";

test("parses many spellings", () => {
  const cases = {
    "1h30m": 5_400_000, "1h 30m": 5_400_000, "90 min": 5_400_000, "1.5h": 5_400_000, "250ms": 250, "2d 4u": 187_200_000,
    "1 week": 604_800_000, "30s": 30_000, "45 seconden": 45_000, "2 uur": 7_200_000, "3 dagen": 259_200_000, "5": 5, "1,5h": null
  };
  for (const [text, ms] of Object.entries(cases)) {
    if (ms === null) assert.throws(() => parseDuration(text), SyntaxError, text);
    else assert.equal(parseDuration(text), ms, text);
  }
  assert.equal(parseDuration(1500), 1500);
  assert.equal(parseDuration(" 1H "), 3_600_000);
});

test("refuses what it cannot read instead of returning 0", () => {
  for (const bad of ["", "abc", "10 parsecs", "1h-30m", "h1", "1h junk"]) assert.throws(() => parseDuration(bad), SyntaxError, bad);
  assert.throws(() => parseDuration(-1), RangeError);
  assert.throws(() => parseDuration(NaN), RangeError);
  assert.throws(() => parseDuration(null), TypeError);
});

test("formats compactly", () => {
  assert.equal(formatDuration(0), "0ms");
  assert.equal(formatDuration(250), "250ms");
  assert.equal(formatDuration(5_400_000), "1h 30m");
  assert.equal(formatDuration(90_061_000), "1d 1h 1m");
  assert.equal(formatDuration(90_061_000, { maxUnits: 4 }), "1d 1h 1m 1s");
  assert.equal(formatDuration(7_200_000), "2h");
  assert.equal(formatDuration(1000), "1s");
});

test("formatting rounds to the units it keeps", () => {
  assert.equal(formatDuration(5_400_000, { maxUnits: 1 }), "2h"); // 1h30 rounds up
  assert.equal(formatDuration(5_399_000, { maxUnits: 1 }), "1h");
  assert.equal(formatDuration(90_061_000, { maxUnits: 2 }), "1d 1h");
  assert.equal(formatDuration(86_399_000, { maxUnits: 2 }), "1d");
});

test("format and parse agree", () => {
  for (const ms of [1000, 61_000, 3_600_000, 5_400_000, 86_400_000 + 3_600_000 + 60_000 + 1000]) {
    assert.equal(parseDuration(formatDuration(ms, { maxUnits: 4 })), ms);
  }
});

test("ISO 8601", () => {
  assert.equal(parseIso("PT1H30M"), 5_400_000);
  assert.equal(parseIso("P1DT12H"), 129_600_000);
  assert.equal(parseIso("P2W"), 1_209_600_000);
  assert.equal(parseIso("PT0.5S"), 500);
  assert.equal(parseIso("pt15m"), 900_000);
  assert.throws(() => parseIso("P1M"), /no fixed length/);
  assert.throws(() => parseIso("P1Y"), /no fixed length/);
  for (const bad of ["", "PT", "P", "1H", "PT1X", "P1DT"]) assert.throws(() => parseIso(bad), SyntaxError, bad);
  assert.equal(toIso(5_400_000), "PT1H30M");
  assert.equal(toIso(129_600_000), "P1DT12H");
  assert.equal(toIso(86_400_000), "P1D");
  assert.equal(toIso(0), "PT0S");
  assert.equal(toIso(500), "PT0.5S");
  for (const ms of [1000, 90_000, 5_400_000, 200_000_000]) assert.equal(parseIso(toIso(ms)), ms);
});
