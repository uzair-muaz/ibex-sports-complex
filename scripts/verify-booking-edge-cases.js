function toDayIndexUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const utcMs = Date.UTC(y, m - 1, d);
  return Math.floor(utcMs / 86400000);
}

function shiftDateUTC(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y2 = dt.getUTCFullYear();
  const m2 = dt.getUTCMonth() + 1;
  const d2 = dt.getUTCDate();
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${y2}-${pad2(m2)}-${pad2(d2)}`;
}

function rangesOverlapHalfOpen(startA, endA, startB, endB) {
  // Half-open overlap: [start, end)
  return startA < endB && startB < endA;
}

function bookingOverlapsCandidate(referenceDateStr, candidateStartTime, candidateDuration, booking) {
  const referenceDay = toDayIndexUTC(referenceDateStr);
  const bookingDay = toDayIndexUTC(booking.date);

  const candidateStartAbs = candidateStartTime;
  const candidateEndAbs = candidateStartTime + candidateDuration;

  const bookingStartAbs = (bookingDay - referenceDay) * 24 + booking.startTime;
  const bookingEndAbs = bookingStartAbs + booking.duration;

  return rangesOverlapHalfOpen(candidateStartAbs, candidateEndAbs, bookingStartAbs, bookingEndAbs);
}

function assignFirstAvailableCourt(courts, candidate, existingBookings) {
  for (const court of courts) {
    const conflict = existingBookings.some(
      (b) =>
        b.courtId === court.id &&
        bookingOverlapsCandidate(candidate.date, candidate.startTime, candidate.duration, b),
    );
    if (!conflict) return court;
  }
  return null;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function run() {
  const ref = "2026-03-23";
  const next = shiftDateUTC(ref, 1);

  // 1) Start at 23:00 with duration 2 hour => blocks [23, 25)
  {
    const candidate = { date: ref, startTime: 23, duration: 2 };
    const existing = [
      { courtId: "c1", date: next, startTime: 0, duration: 1 }, // [24,25)
    ];
    assert(
      bookingOverlapsCandidate(ref, 23, 2, existing[0]),
      "23:00 +2h should overlap next-day 0:00 +1h",
    );
  }

  // 2) Candidate 23:00 +2h should NOT overlap next-day 1:00 +1h
  {
    const existing = { courtId: "c1", date: next, startTime: 1, duration: 1 }; // [25,26)
    assert(
      !bookingOverlapsCandidate(ref, 23, 2, existing),
      "23:00 +2h should NOT overlap next-day 1:00 +1h (boundary at 25:00)",
    );
  }

  // 3) Boundary at exactly midnight: candidate ends at 24:00 should not conflict with booking starting at 24:00
  {
    const existing = { courtId: "c1", date: next, startTime: 0, duration: 0.5 }; // [24,24.5)
    assert(
      !bookingOverlapsCandidate(ref, 23, 1, existing), // candidate [23,24)
      "23:00 +1h should NOT overlap booking starting exactly at next midnight",
    );
  }

  // 4) Half-hour boundary: 23:30 +1h ends at 24:30; overlaps with next-day 0:00 +0.5h
  {
    const existing = { courtId: "c1", date: next, startTime: 0, duration: 0.5 }; // [24,24.5)
    assert(
      bookingOverlapsCandidate(ref, 23.5, 1, existing), // [23.5,24.5)
      "23:30 +1h should overlap next-day 0:00 +0.5h",
    );
  }

  // 5) Court assignment: pick first available court
  {
    const courts = [
      { id: "court1", name: "Court 1" },
      { id: "court2", name: "Court 2" },
    ];

    const existingBookings = [
      { courtId: "court1", date: ref, startTime: 11, duration: 1 }, // [11,12)
    ];

    const candidate = { date: ref, startTime: 10, duration: 2 }; // [10,12)
    const assigned = assignFirstAvailableCourt(courts, candidate, existingBookings);
    assert(assigned && assigned.id === "court2", "Should assign court2 when court1 is blocked");
  }

  // 6) Extension conflict: extended booking to end at 24 overlaps existing booking [23,24)
  {
    const courts = [{ id: "c1", name: "Court 1" }];
    const existingBookings = [
      { courtId: "c1", date: ref, startTime: 23, duration: 1 }, // [23,24)
    ];

    const original = { date: ref, startTime: 22, duration: 1 }; // [22,23)
    const extended = { ...original, duration: original.duration + 1 }; // [22,24)

    const assignedBefore = assignFirstAvailableCourt(courts, original, existingBookings);
    const assignedAfter = assignFirstAvailableCourt(courts, extended, existingBookings);

    assert(assignedBefore !== null, "Before extension: court should be free");
    assert(assignedAfter === null, "After extension: should be blocked by [23,24) booking");
  }

  // 7) Extension across midnight should be rejected if it overlaps next-day early booking
  {
    const courts = [{ id: "c1", name: "Court 1" }];
    const existingBookings = [
      { courtId: "c1", date: next, startTime: 0, duration: 0.5 }, // [24,24.5)
    ];

    const original = { date: ref, startTime: 23.5, duration: 0.5 }; // [23.5,24)
    const extended = { ...original, duration: original.duration + 1 }; // [23.5,25)

    const assignedAfter = assignFirstAvailableCourt(courts, extended, existingBookings);
    assert(assignedAfter === null, "Extension should overlap with next-day early booking");
  }

  console.log("All booking edge-case assertions passed.");
}

run();

