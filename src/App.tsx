import React, { useEffect, useState } from "react";

// --- Types ---
interface PartyAllocation {
  name: string;
  votes: number;
  seats: number; // allocated seats from main calculation
  extraSeats: number; // leftover seats (if applicable)
  totalSeats: number; // seats + extraSeats
  symbolUrl: string;
}

interface ElectionData {
  total_votes: number;
  threshold_limit: number;
  seat_allocation: PartyAllocation[];
  invalid_parties: Omit<
    PartyAllocation,
    "seats" | "extraSeats" | "totalSeats"
  >[];
}

const ElectionDashboard: React.FC = () => {
  const [data, setData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/election-results")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch election data");
        return res.json();
      })
      .then((json: ElectionData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">
            Calculating PR Seats...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500">
        Error: {error || "No data available"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl mb-4">
            House of Representatives{" "}
            <span className="text-blue-600">PR 2082</span>
          </h1>
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-ping"></span>
            Live Projection: {data.total_votes.toLocaleString()} Total Votes
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Seats from valid votes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
              Seats from Valid Votes
            </h3>
            <p className="text-2xl font-bold text-slate-900">
              {data.seat_allocation
                .reduce((sum, p) => sum + p.seats, 0)
                .toLocaleString()}
              /110
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Allocated by Modified Sainte-Laguë
            </p>
          </div>

          {/* Threshold votes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
              3% Threshold
            </h3>
            <p className="text-2xl font-bold text-slate-900">
              {data.threshold_limit.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Votes required to qualify for seats
            </p>
          </div>

          {/* Extra seats from invalid votes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
              Extra Seats (from Invalid Votes)
            </h3>
            <p className="text-2xl font-bold text-slate-900">
              {data.seat_allocation
                .reduce((sum, p) => sum + (p.extraSeats || 0), 0)
                .toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Distributed proportionally from invalid votes
            </p>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">
                    Political Party
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">
                    Votes
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center">
                    Seats
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center">
                    Extra Seats
                  </th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-center">
                    Total Seats
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.seat_allocation.map((party, index) => (
                  <tr
                    key={party.name}
                    className="hover:bg-blue-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 text-slate-400 font-mono text-sm">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg border border-slate-200 p-1 bg-white group-hover:scale-110 transition-transform">
                          <img
                            src={party.symbolUrl}
                            alt={party.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-bold text-slate-800 text-lg">
                          {party.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">
                        {party.votes.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 italic">
                        Valid PR Votes
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{party.seats}</td>
                    <td className="px-6 py-4 text-center">
                      {party.extraSeats}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {party.totalSeats}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invalid Parties */}
        {data.invalid_parties.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              Parties below 3% threshold (Not Allotted)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.invalid_parties.map((party) => (
                <div
                  key={party.name}
                  className="flex items-center gap-3 p-4 bg-slate-100 border border-slate-200 rounded-xl opacity-60 hover:opacity-80 transition"
                >
                  <div className="w-10 h-10 rounded-lg border border-slate-300 p-1 bg-white">
                    <img
                      src={party.symbolUrl}
                      alt={party.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">{party.name}</p>
                    <p className="text-xs text-slate-500">
                      {party.votes.toLocaleString()} Votes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mandatory Electoral Warning */}
        <div className="mb-8 p-4 bg-slate-100 border-l-4 border-blue-600 rounded-r-xl shadow-sm text-sm">
          <p className="text-slate-700 leading-relaxed">
            <strong className="text-slate-900 uppercase text-xs block mb-1">
              Notice
            </strong>
            This dashboard provides a{" "}
            <strong>mathematical representation only</strong>. Actual seat
            allocation is contingent upon a party's
            <strong> National Party Status</strong> (requiring a 3% PR threshold
            and at least 1 FPTP seat), attainment of minimum valid votes, and
            strict adherence to <strong>inclusion criteria</strong>
            (including 33% female representation and ethnic cluster quotas).
          </p>
        </div>

        {/* Methodology Section */}
        <section className="mt-12 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-800">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs">
              ?
            </span>
            How are these seats calculated?
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Simple Explanation */}
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Seats are awarded one-by-one using the{" "}
                <strong>Modified Sainte-Laguë</strong> method. It ensures the
                parliament reflects the total vote share while being fair to
                mid-sized parties.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="text-blue-600 font-bold">1.</div>
                  <p className="text-sm">
                    <strong>The 3% Cut-off:</strong> First, any party with less
                    than 3% of total votes is disqualified to prevent too many
                    tiny parties.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="text-blue-600 font-bold">2.</div>
                  <p className="text-sm">
                    <strong>The "Penalty" Rule:</strong> Every time a party wins
                    a seat, it becomes <strong>much harder</strong> for them to
                    win the next one. We divide their votes by a bigger number
                    each time (1.4, then 3, 5, 7...).
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Example */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 tracking-wider">
                Example: Awarding 2 Seats
              </h3>

              <div className="space-y-4">
                {/* Round 1 */}
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">
                    Round 1: First Seat
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white rounded border border-blue-100">
                      <span className="block text-slate-500">
                        Party A (10k votes)
                      </span>
                      <span className="font-mono font-bold">
                        10,000 ÷ 1.4 = 7,142
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="block text-slate-500">
                        Party B (8k votes)
                      </span>
                      <span className="font-mono">8,000 ÷ 1.4 = 5,714</span>
                    </div>
                  </div>
                  <p className="text-[10px] mt-1 text-slate-500">
                    🏆 <strong>Party A</strong> wins Seat #1 (7,142 is highest).
                  </p>
                </div>

                {/* Round 2 */}
                <div>
                  <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">
                    Round 2: The Penalty in Action
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-orange-50 rounded border border-orange-200">
                      <span className="block text-slate-500">
                        Party A (Has 1 Seat)
                      </span>
                      <span className="font-mono font-bold">
                        10,000 ÷ 3 = 3,333
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200 shadow-sm">
                      <span className="block text-slate-500">
                        Party B (Has 0 Seats)
                      </span>
                      <span className="font-mono font-bold">
                        8,000 ÷ 1.4 = 5,714
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] mt-1 text-slate-500">
                    🏆 <strong>Party B</strong> wins Seat #2 (5,714 is highest).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center text-slate-500 gap-4">
          <p className="text-sm">
            Methodology:{" "}
            <strong className="text-slate-700">Modified Sainte-Laguë</strong>{" "}
            (1.4, 3, 5...)
          </p>
          <div className="flex gap-2 text-xs">
            <span className="bg-slate-200 px-2 py-1 rounded">
              Election Commission Data
            </span>
            <span className="bg-slate-200 px-2 py-1 rounded">
              Real-time Forecast
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ElectionDashboard;
