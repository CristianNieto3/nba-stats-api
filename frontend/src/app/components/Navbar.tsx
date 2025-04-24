'use client'

import Link from 'next/link'
import { BookOpen, Filter, Trophy, Users, Home } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center shadow-sm">

      {/* LOGO / HOME LINK */}
      <Link href="/" className="text-white font-bold text-xl flex items-center gap-2">
        <Home size={20} /> NBA Stats Hub
      </Link>

      {/* NAV LINKS */}
      <div className="flex gap-6 text-zinc-300 text-sm">
        <Link href="/filter" className="hover:text-white flex items-center gap-1">
          <Filter size={16} /> Filter
        </Link>
        <Link href="/compare" className="hover:text-white flex items-center gap-1">
          <Users size={16} /> Compare
        </Link>
        <Link href="/leaders" className="hover:text-white flex items-center gap-1">
          <Trophy size={16} /> Leaders
        </Link>
        <Link href="/about" className="hover:text-white flex items-center gap-1">
          <BookOpen size={16} /> About
        </Link>
      </div>
    </nav>
  )
}
