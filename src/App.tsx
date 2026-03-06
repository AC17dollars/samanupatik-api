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
