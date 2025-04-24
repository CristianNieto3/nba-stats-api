'use client'

import { useEffect, useState } from "react";
import Navbar from '../components/Navbar';
import { Loader2 } from 'lucide-react';

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

export default function ComparePage() {
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [suggestions1, setSuggestions1] = useState<string[]>([]);
  const [suggestions2, setSuggestions2] = useState<string[]>([]);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNames = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/v1/players");
        const data: Player[] = await res.json();
        const names = data.map((p) => p.name);
        setAllNames(names);
      } catch {
        setError("Could not load players.");
      }
    };
    fetchNames();
  }, []);

  const handleCompare = async () => {
    setError("");
    setPlayers([]);
    setLoading(true);

    if (!name1 || !name2) {
      setError("Please enter both player names.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/v1/players/compare?name1=${encodeURIComponent(name1)}&name2=${encodeURIComponent(name2)}`);
      if (!res.ok) throw new Error("Comparison failed");
      const data: Player[] = await res.json();
      setPlayers(data);
    } catch {
      setError("Comparison failed. Check player names.");
    } finally {
      setLoading(false);
    }
  };

  const updateInput = (value: string, setName: (val: string) => void, setSuggest: (val: string[]) => void) => {
    setName(value);
    setSuggest(
      allNames
        .filter((name) => name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white px-6 py-16 pt-24">
        <h1 className="text-4xl font-bold mb-8 text-center">🆚 Compare NBA Players</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-3xl mx-auto">
          {/* Player 1 Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Player 1"
              value={name1}
              onChange={(e) => updateInput(e.target.value, setName1, setSuggestions1)}
              className="p-2 rounded bg-zinc-800 border border-zinc-600 text-white w-full"
            />
            {name1 && suggestions1.length > 0 && (
              <ul className="absolute bg-zinc-800 border border-zinc-600 w-full mt-1 z-10 rounded shadow max-h-40 overflow-y-auto">
                {suggestions1.map((name, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setName1(name);
                      setSuggestions1([]);
                    }}
                    className="p-2 hover:bg-zinc-700 cursor-pointer"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Player 2 Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Player 2"
              value={name2}
              onChange={(e) => updateInput(e.target.value, setName2, setSuggestions2)}
              className="p-2 rounded bg-zinc-800 border border-zinc-600 text-white w-full"
            />
            {name2 && suggestions2.length > 0 && (
              <ul className="absolute bg-zinc-800 border border-zinc-600 w-full mt-1 z-10 rounded shadow max-h-40 overflow-y-auto">
                {suggestions2.map((name, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setName2(name);
                      setSuggestions2([]);
                    }}
                    className="p-2 hover:bg-zinc-700 cursor-pointer"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleCompare}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded mb-10 shadow-lg"
          >
            Compare
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </div>

        {loading ? (
          <div className="flex justify-center items-center mt-10">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : players.length === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-zinc-800 border border-zinc-700 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition duration-300"
              >
                <h2 className="text-xl font-bold text-blue-400 text-center mb-2">{p.name}</h2>
                <p className="text-sm text-gray-400 text-center">Team: <span className="text-white">{p.team}</span></p>
                <p className="text-sm text-gray-400 text-center">Position: <span className="text-white">{p.position}</span></p>
                <div className="mt-3 space-y-1 text-center">
                  <p><span className="text-blue-300">PPG:</span> {p.ppg.toFixed(1)}</p>
                  <p><span className="text-green-300">RPG:</span> {p.rpg.toFixed(1)}</p>
                  <p><span className="text-purple-300">APG:</span> {p.apg.toFixed(1)}</p>
                  <p><span className="text-yellow-300">FG%:</span> {p.fg_percent.toFixed(1)}</p>
                  <p><span className="text-pink-300">3PT%:</span> {p.three_pt_percent.toFixed(1)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">Season: {p.season}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
