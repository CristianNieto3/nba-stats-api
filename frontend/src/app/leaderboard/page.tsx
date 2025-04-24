'use client'

import { useEffect, useState } from 'react'

type Player = {
  id: number;
  name: string;
  team: string;
  ppg: number;
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([])
  const [stat, setStat] = useState("ppg")
  const [limit, setLimit] = useState(5)

  useEffect(() => {
    fetch(`http://localhost:8080/api/v1/players/leaders/${stat}?limit=${limit}`)
      .then(res => res.json())
      .then(data => setPlayers(data))
  }, [stat, limit])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">🏀 NBA Stat Leaders</h1>

      {/* Stat Selector */}
      <div className="flex gap-4 mb-8">
        <select
          value={stat}
          onChange={(e) => setStat(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="ppg">PPG</option>
          <option value="rpg">RPG</option>
          <option value="apg">APG</option>
          <option value="fg_percent">FG%</option>
          <option value="three_pt_percent">3PT%</option>
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="border p-2 rounded"
        >
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
          <option value={15}>Top 15</option>
        </select>
      </div>

      {/* Player Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {players.map((player, index) => (
          <div key={player.id} className="border rounded p-4 shadow bg-white">
            <h2 className="text-xl font-semibold">{`#${index + 1} ${player.name}`}</h2>
            <p className="text-gray-700">Team: {player.team}</p>
            <p className="text-gray-900 font-bold uppercase">{stat}: {player[stat as keyof Player]}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
