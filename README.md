# @sandsoftwaresolutions/duration

[![CI](https://github.com/SandSoftwareSolutions/ss-duration/actions/workflows/ci.yml/badge.svg)](https://github.com/SandSoftwareSolutions/ss-duration/actions/workflows/ci.yml)

Durations as people write them: `"1h30m"`, `"90 min"`, `"2 uur"`. Read them from config files and forms, show them in a screen, and exchange them as ISO 8601 (`PT1H30M`). Dutch units work too. No dependencies.

## Install

```bash
npm install @sandsoftwaresolutions/duration
```

## Usage

```js
import { parseDuration, formatDuration, parseIso, toIso } from "@sandsoftwaresolutions/duration";

parseDuration("1h30m");        // 5400000 (milliseconds)
parseDuration("2 uur 15 min"); // 8100000
parseDuration("1.5h");         // 5400000

formatDuration(5_400_000);                  // "1h 30m"
formatDuration(90_061_000);                 // "1d 1h 1m"
formatDuration(5_400_000, { maxUnits: 1 }); // "2h" (rounded)

parseIso("PT1H30M");  // 5400000
toIso(5_400_000);     // "PT1H30M"
```

## Rules

- Units: `ms`, `s`, `m`, `h`, `d`, `w`, with the usual spellings (`sec`, `minutes`, `hours`, `days`, `weeks`) and Dutch (`seconden`, `minuten`, `uur`/`u`, `dagen`, `weken`). A bare number is milliseconds.
- **It refuses what it cannot read.** `"10 parsecs"`, `"abc"` or `""` throw an error instead of becoming 0, so a typo in a config is noticed at startup and not as "the timeout is zero" in production.
- `formatDuration` shows at most `maxUnits` units (default 3) and rounds the rest.
- ISO 8601: weeks, days, hours, minutes and seconds. **Years and months are refused**, because they have no fixed length. Use days.
- A day is always 24 hours and a week 7 of them: this is a length of time, not a calendar day, so it does not follow daylight saving changes.
- Results are whole milliseconds (`"1.7"` gives 2). Anything beyond 2^53 ms (about 285 000 years) throws a `RangeError` instead of returning an inexact number.
