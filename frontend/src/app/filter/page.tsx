'use client'

import { useState } from "react";
import Navbar from '../components/Navbar';
import { Loader2 } from 'lucide-react';

// Define Player type
type Player = {
  id: number;
  name: string;
  team: string;
  position: string;
  ppg: number;
  rpg: number;
  apg: number;
  fg_percent: number;
  three_pt_percent: number;
  season: number;
};

// Define teams array
const teams = [
  { label: "Atlanta Hawks", value: "ATL" },
  { label: "Boston Celtics", value: "BOS" },
  { label: "Brooklyn Nets", value: "BKN" },
  { label: "Charlotte Hornets", value: "CHA" },
  { label: "Chicago Bulls", value: "CHI" },
  { label: "Cleveland Cavaliers", value: "CLE" },
  { label: "Dallas Mavericks", value: "DAL" },
  { label: "Denver Nuggets", value: "DEN" },
  { label: "Detroit Pistons", value: "DET" },
  { label: "Golden State Warriors", value: "GSW" },
  { label: "Houston Rockets", value: "HOU" },
  { label: "Indiana Pacers", value: "IND" },
  { label: "Los Angeles Clippers", value: "LAC" },
  { label: "Los Angeles Lakers", value: "LAL" },
  { label: "Memphis Grizzlies", value: "MEM" },
  { label: "Miami Heat", value: "MIA" },
  { label: "Milwaukee Bucks", value: "MIL" },
  { label: "Minnesota Timberwolves", value: "MIN" },
  { label: "New Orleans Pelicans", value: "NOP" },
  { label: "New York Knicks", value: "NYK" },
  { label: "Oklahoma City Thunder", value: "OKC" },
  { label: "Orlando Magic", value: "ORL" },
  { label: "Philadelphia 76ers", value: "PHI" },
  { label: "Phoenix Suns", value: "PHX" },
  { label: "Portland Trail Blazers", value: "POR" },
  { label: "Sacramento Kings", value: "SAC" },
  { label: "San Antonio Spurs", value: "SAS" },
  { label: "Toronto Raptors", value: "TOR" },
  { label: "Utah Jazz", value: "UTA" },
  { label: "Washington Wizards", value: "WAS" }
];

export default function FilterPage() {
  const [team, setTeam] = useState("");
  const [position, setPosition] = useState("");
  const [minPpg, setMinPpg] = useState("");
  const [minRpg, setMinRpg] = useState("");
  const [minApg, setMinApg] = useState("");
  const [minFg, setMinFg] = useState("");
  const [minThreePt, setMinThreePt] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFilter = async () => {
    setError("");
    setLoading(true);
    const queryParams = new URLSearchParams();

    if (team) queryParams.append("team", team);
    if (position) queryParams.append("position", position);
    if (minPpg) queryParams.append("minPpg", minPpg);
    if (minRpg) queryParams.append("minRpg", minRpg);
    if (minApg) queryParams.append("minApg", minApg);
    if (minFg) queryParams.append("minFg", minFg);
    if (minThreePt) queryParams.append("minThreePt", minThreePt);

    try {
      const res = await fetch(`http://localhost:8080/api/v1/players/filter?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      setError("Failed to fetch players. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white px-6 py-16 pt-24">
        <h1 className="text-4xl font-bold mb-8 text-center">🔎 Filter NBA Players</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-4xl mx-auto">
          <label htmlFor="team-select" className="sr-only">Select Team</label>
          <select id="team-select" className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Select Team </option>
            {teams.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <label htmlFor="position-select" className="sr-only">Select Position</label>
          <select id="position-select" className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="">Select Position</option>
            <option value="G">Guard</option>
            <option value="F">Forward</option>
            <option value="C">Center</option>
          </select>

          <input className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" placeholder="Min PPG" value={minPpg} onChange={(e) => setMinPpg(e.target.value)} />
          <input className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" placeholder="Min RPG" value={minRpg} onChange={(e) => setMinRpg(e.target.value)} />
          <input className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" placeholder="Min APG" value={minApg} onChange={(e) => setMinApg(e.target.value)} />
          <input className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" placeholder="Min FG%" value={minFg} onChange={(e) => setMinFg(e.target.value)} />
          <input className="bg-zinc-800 text-white border border-zinc-600 p-2 rounded" placeholder="Min 3PT%" value={minThreePt} onChange={(e) => setMinThreePt(e.target.value)} />
        </div>

        <div className="text-center">
          <button onClick={handleFilter} className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded mb-10 shadow-lg">
            Apply Filters
          </button>
          {error && <p className="text-red-500 mb-4">{error}</p>}
        </div>

        {loading ? (
          <div className="flex justify-center items-center mt-10">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-zinc-800 border border-zinc-700 p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"

            >
              <h2 className="text-xl font-bold mb-1 text-white text-center">{player.name}</h2>
              <p className="text-sm text-gray-400 mb-1 text-center">
                Team: <span className="text-white">{player.team}</span>
              </p>
              <p className="text-sm text-gray-400 mb-1 text-center">
                Position: <span className="text-white">{player.position}</span>
              </p>
        
              <div className="mt-2 space-y-1 text-center font-semibold">
                <p>
                  <span className="text-orange-400">PPG:</span> {player.ppg.toFixed(1)}
                </p>
                <p>
                  <span className="text-emerald-400">RPG:</span> {player.rpg.toFixed(1)}
                </p>
                <p>
                  <span className="text-sky-400">APG:</span> {player.apg.toFixed(1)}
                </p>
                <p>
                  <span className="text-yellow-400">FG%:</span> {player.fg_percent.toFixed(1)}
                </p>
                <p>
                  <span className="text-rose-400">3PT%:</span> {player.three_pt_percent.toFixed(1)}
                </p>
              </div>
        
              <p className="text-xs text-gray-500 mt-3 text-center">Season: {player.season}</p>
            </div>
          ))}
        </div>
        
        )}
      </main>
    </>
  );
}
