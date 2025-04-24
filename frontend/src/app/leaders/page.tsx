'use client'

import { useEffect, useState } from "react";
import Navbar from '../components/Navbar';
import { Loader2 } from 'lucide-react';
import { Medal } from 'lucide-react';

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

const stats = [
  { label: "Points Per Game", value: "ppg" },
  { label: "Assists Per Game", value: "apg" },
  { label: "Rebounds Per Game", value: "rpg" },
  { label: "Field Goal %", value: "fg_percent" },
  { label: "3PT %", value: "three_pt_percent" },
];

export default function LeadersPage() {
  const [stat, setStat] = useState("ppg");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/players/leaders/${stat}?limit=10`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPlayers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, [stat]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white px-6 py-16 pt-24">
        <h1 className="text-4xl font-bold mb-10 text-center">🏆 Stat Leaders</h1>

        <div className="flex justify-center mb-10">
          <label htmlFor="stat-select" className="sr-only">
            Select a statistic
          </label>
          <select
            id="stat-select"
            className="bg-zinc-800 text-white border border-zinc-600 p-3 rounded"
            value={stat}
            onChange={(e) => setStat(e.target.value)}
          >
            {stats.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-blue-400" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            
            {/* 🥇 Vertical Ranked List */}
            <div className="col-span-2 space-y-4">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-zinc-800 border border-zinc-600 p-4 rounded-lg shadow-lg flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200"
                >
                  <div className="text-2xl font-bold w-8 text-center text-blue-400">
                    {index === 0 ? <Medal className="text-yellow-400" /> : index + 1}
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-lg font-semibold">{player.name}</h2>
                    <p className="text-sm text-gray-400">{player.team} — {player.position}</p>
                  </div>
                  <div className="text-right font-mono text-white">
                    {stat === 'ppg' && player.ppg.toFixed(1)}
                    {stat === 'apg' && player.apg.toFixed(1)}
                    {stat === 'rpg' && player.rpg.toFixed(1)}
                    {stat === 'fg_percent' && `${player.fg_percent.toFixed(1)}%`}
                    {stat === 'three_pt_percent' && `${player.three_pt_percent.toFixed(1)}%`}
                  </div>
                </div>
              ))}
            </div>

            {/* 🧍‍♂️ Top Performer Card */}
            {players.length > 0 && (
              <div className="bg-zinc-800 border border-zinc-600 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col items-center">
                <h3 className="text-xl font-bold text-yellow-300 mb-4">Top Performer</h3>
                <p className="text-center text-2xl font-semibold text-white mb-2">{players[0].name}</p>
                <p className="text-sm text-gray-400 mb-4">{players[0].team} — {players[0].position}</p>
                <p className="text-white text-lg">
                  {stat === 'ppg' && `${players[0].ppg.toFixed(1)} PPG`}
                  {stat === 'apg' && `${players[0].apg.toFixed(1)} APG`}
                  {stat === 'rpg' && `${players[0].rpg.toFixed(1)} RPG`}
                  {stat === 'fg_percent' && `${players[0].fg_percent.toFixed(1)} FG%`}
                  {stat === 'three_pt_percent' && `${players[0].three_pt_percent.toFixed(1)} 3PT%`}
                </p>
                <p className="text-xs text-gray-500 mt-3">Season: {players[0].season}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
