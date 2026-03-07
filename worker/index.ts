import { Hono } from "hono";
import type { Fetcher } from "@cloudflare/workers-types";

type Bindings = {
  ASSETS: Fetcher;
};

// API routes (mounted at /api via app.route)
const api = new Hono<{ Bindings: Bindings }>();

const TOTAL_SEATS = 110;
const THRESHOLD_PERCENT = 3;

type Party = {
  name: string;
  votes: number;
  symbolID: number;
};

function calculateSeats(parties: Party[]) {
  const totalVotes = parties.reduce((s, p) => s + p.votes, 0);
  const thresholdVotes = (totalVotes * THRESHOLD_PERCENT) / 100;

  const qualified = parties.filter((p) => p.votes >= thresholdVotes);
  const invalid = parties.filter((p) => p.votes < thresholdVotes);

  const totalQualifiedVotes = qualified.reduce((s, p) => s + p.votes, 0);
  const totalInvalidVotes = invalid.reduce((s, p) => s + p.votes, 0);

  // --- Step 1: Modified Sainte-Laguë allocation (totalSeats) ---
  const divisors: number[] = [1.4];
  for (let i = 3; i <= 4 * TOTAL_SEATS - 1; i += 2) divisors.push(i);

  const quotients: { party: string; value: number }[] = [];
  for (const party of qualified) {
    for (const d of divisors) {
      quotients.push({ party: party.name, value: party.votes / d });
    }
  }
  quotients.sort((a, b) => b.value - a.value);

  const top = quotients.slice(0, TOTAL_SEATS);
  const seatMap: Record<string, number> = {};
  for (const q of top) seatMap[q.party] = (seatMap[q.party] || 0) + 1;

  // --- Step 2: Simple proportional allocation including invalid votes ---
  const totalVotesForSimple = totalQualifiedVotes + totalInvalidVotes;
  const simpleSeatsMap: Record<string, number> = {};
  for (const p of qualified) {
    simpleSeatsMap[p.name] = Math.floor(
      (p.votes / totalVotesForSimple) * TOTAL_SEATS,
    );
  }

  // --- Step 3: Compute extra seats and percentages ---
  const seatDistribution = qualified.map((p) => {
    const totalSeats = seatMap[p.name] || 0;
    const simpleSeats = simpleSeatsMap[p.name] || 0;
    const extraSeats = totalSeats - simpleSeats;
    const votePercent = totalVotes > 0 ? (p.votes / totalVotes) * 100 : 0;
    const seatPercent = (totalSeats / TOTAL_SEATS) * 100;
    return {
      name: p.name,
      votes: p.votes,
      seats: simpleSeats,
      extraSeats,
      totalSeats,
      votePercent,
      seatPercent,
      symbolUrl: `https://result.election.gov.np/Images/symbol-hor-pa/${p.symbolID}.jpg`,
    };
  });

  const invalidParties = invalid.map((p) => {
    const votePercent = totalVotes > 0 ? (p.votes / totalVotes) * 100 : 0;
    return {
      name: p.name,
      votes: p.votes,
      votePercent,
      symbolUrl: `https://result.election.gov.np/Images/symbol-hor-pa/${p.symbolID}.jpg`,
    };
  });

  return {
    totalVotes,
    thresholdVotes,
    totalQualifiedVotes,
    seatAllocation: seatDistribution.toSorted((a, b) => b.votes - a.votes),
    invalidParties: invalidParties.toSorted((a, b) => b.votes - a.votes),
  };
}
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_AGE = 120; // 2 minutes, for Cache-Control header

async function fetchElectionData(): Promise<{
  total_votes: number;
  total_qualified_votes: number;
  threshold_limit: number;
  seat_allocation: unknown[];
  invalid_parties: unknown[];
}> {
  const USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64; rv:148.0) Gecko/20100101 Firefox/148.0";

  // STEP 1 — get session + CSRF cookies
  const pageRes = await fetch(
    "https://result.election.gov.np/PRVoteChartResult2082.aspx",
    {
      headers: {
        Host: "result.election.gov.np",
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://result.election.gov.np/",
      },
    },
  );

  const cookies =
    (
      pageRes.headers as Headers & { getSetCookie?(): string[] }
    ).getSetCookie?.() ?? [];
  let sessionId = "";
  let csrfToken = "";
  for (const cookie of cookies) {
    if (cookie.startsWith("ASP.NET_SessionId"))
      sessionId = cookie.split(";")[0].split("=")[1];
    if (cookie.startsWith("CsrfToken"))
      csrfToken = cookie.split(";")[0].split("=")[1];
  }

  const cookieHeader = `ASP.NET_SessionId=${sessionId}; CsrfToken=${csrfToken}`;

  // STEP 2 — fetch JSON
  const dataRes = await fetch(
    "https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/Common/PRHoRPartyTop5.txt",
    {
      headers: {
        Host: "result.election.gov.np",
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: "https://result.election.gov.np/PRVoteChartResult2082.aspx",
        "X-CSRF-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookieHeader,
      },
    },
  );

  if (!dataRes.ok) throw new Error(`upstream forbidden: ${dataRes.status}`);

  const rawData: {
    PoliticalPartyName: string | null;
    TotalVoteReceived: number;
    SymbolID: number;
  }[] = await dataRes.json();

  // Aggregate votes per party
  const partyVotes: Record<string, { votes: number; symbolID: number }> = {};
  for (const row of rawData) {
    const name = row.PoliticalPartyName;
    const votes = Number(row.TotalVoteReceived) || 0;
    const symbolID = row.SymbolID;
    if (!name) continue;
    if (!partyVotes[name]) partyVotes[name] = { votes: 0, symbolID };
    partyVotes[name].votes += votes;
  }

  const parties: Party[] = Object.entries(partyVotes).map(([name, data]) => ({
    name,
    votes: data.votes,
    symbolID: data.symbolID,
  }));

  const result = calculateSeats(parties);

  return {
    total_votes: result.totalVotes,
    total_qualified_votes: result.totalQualifiedVotes,
    threshold_limit: result.thresholdVotes,
    seat_allocation: result.seatAllocation,
    invalid_parties: result.invalidParties,
  };
}

function jsonResponse(
  data: unknown,
  opts?: {
    cachedAt?: number;
    cacheStatus?: "hit" | "miss" | "stale" | "revalidated";
  },
): Response {
  const body = JSON.stringify(data);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Cache": opts?.cacheStatus ?? "miss",
    "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, must-revalidate`,
  };
  if (opts?.cachedAt != null) headers["X-Cached-At"] = String(opts.cachedAt);
  return new Response(body, { headers });
}

function withCacheHeader(
  res: Response,
  status: "hit" | "miss" | "stale",
): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Cache", status);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

api.get("/election-results", async (c) => {
  const now = Date.now();
  const cacheKeyUrl = new URL("/api/election-results", c.req.url).href;
  const cacheReq = new Request(cacheKeyUrl);
  const cached = await caches.default.match(cacheReq);

  if (cached) {
    const cachedAt = Number.parseInt(
      cached.headers.get("X-Cached-At") || "0",
      10,
    );
    const isFresh = cachedAt > 0 && now - cachedAt < CACHE_TTL_MS;

    if (isFresh) {
      return withCacheHeader(cached, "hit");
    }

    try {
      const data = await fetchElectionData();
      const res = jsonResponse(data, {
        cachedAt: now,
        cacheStatus: "revalidated",
      });
      await caches.default.put(cacheReq, res.clone());
      return res;
    } catch {
      return withCacheHeader(cached, "stale");
    }
  }

  try {
    const data = await fetchElectionData();
    const res = jsonResponse(data, { cachedAt: now, cacheStatus: "miss" });
    await caches.default.put(cacheReq, res.clone());
    return res;
  } catch {
    return c.json({ error: "upstream error" }, 500);
  }
});

// Main app: API at /api/*, React SPA fallback for everything else
const app = new Hono<{ Bindings: Bindings }>();
app.route("/api", api);
app.all("*", async (c): Promise<Response> => {
  try {
    const asset = await c.env.ASSETS.fetch(c.req.raw);
    if (asset.status === 404) {
      return new Response("Not Found", { status: 404 });
    }
    return asset;
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
});

export default app;
