'use client'

import Navbar from './components/Navbar'
import { useRouter } from 'next/navigation'
import { Filter, Trophy, Users } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white px-6 py-16 pt-24 flex flex-col items-center justify-center">

        {/* ✅ HERO TEXT */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            🏀 NBA Player Stats Hub
          </h1>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Real-time stats. Compare players. Track leaders. Built with Spring Boot + PostgreSQL + Next.js.
          </p>
        </div>

        {/* ✅ BUTTON SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">

          <button
            onClick={() => router.push('/filter')}
            className="bg-blue-700 hover:bg-blue-600 transition-colors duration-200 px-6 py-4 rounded-lg font-medium shadow flex items-center justify-center gap-2"
          >
            <Filter size={20} /> Filter Players
          </button>

          <button
            onClick={() => router.push('/compare')}
            className="bg-green-700 hover:bg-green-600 transition-colors duration-200 px-6 py-4 rounded-lg font-medium shadow flex items-center justify-center gap-2"
          >
            <Users size={20} /> Compare Players
          </button>

          <button
            onClick={() => router.push('/leaders')}
            className="bg-purple-700 hover:bg-purple-600 transition-colors duration-200 px-6 py-4 rounded-lg font-medium shadow flex items-center justify-center gap-2"
          >
            <Trophy size={20} /> Stat Leaders
          </button>
        </div>

        <p className="text-xs text-zinc-600 mt-12 text-center">
          Built by Cristian Nieto 
        </p>
      </main>
    </>
  )
}
