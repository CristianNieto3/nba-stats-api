'use client'
import Link from 'next/link'
import { Info, Layers, User } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AboutPage() {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white px-6 py-12 flex flex-col">

      {/* Title */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="text-3xl sm:text-4xl font-bold">About This Project</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Full-stack application powered by Spring Boot, PostgreSQL, and Next.js.
        </p>
      </motion.div>

      {/* Frosted + Animated Border */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative p-[2px] rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-green-500 animate-gradient shadow-xl max-w-3xl mx-auto"
      >
        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-xl border border-white/10 space-y-10">

          {/* Project Purpose */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info size={20} className="text-blue-400" />
              <h2 className="text-2xl font-semibold">Project Purpose</h2>
            </div>
            <p className="text-zinc-300 leading-relaxed text-base sm:text-lg">
              This app was built as a full-stack portfolio project to practice integrating a Java backend with a modern React/Next.js frontend.
              It allows users to view, filter, and compare real NBA player statistics. All data is stored in a PostgreSQL database, with dynamic filtering and comparisons handled via a Spring Boot API.
            </p>
          </div>

          {/* Tech Stack */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={20} className="text-purple-400" />
              <h2 className="text-2xl font-semibold">Tech Stack</h2>
            </div>
            <ul className="text-zinc-300 list-disc list-inside space-y-2 text-base sm:text-lg">
              <li><strong>Backend:</strong> Spring Boot + PostgreSQL + JPA + REST</li>
              <li><strong>Frontend:</strong> Next.js 14 + TailwindCSS + Lucide Icons</li>
              <li><strong>Extras:</strong> Python script to fetch live NBA stats and insert into the DB</li>
            </ul>
          </div>

          {/* About Me */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User size={20} className="text-green-400" />
              <h2 className="text-2xl font-semibold">About Me</h2>
            </div>
            <p className="text-zinc-300 leading-relaxed text-base sm:text-lg">
              I’m a computer science student with a passion for clean code, backend logic, and creative UI. This project helped me level up my full-stack skills and understand how data flows from raw APIs to structured visual interfaces.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Back Button */}
      <div className="text-center mt-12">
        <Link href="/" className="text-blue-400 hover:underline text-sm">
          ← Back to Home
        </Link>
      </div>

      {/* Footer Credit */}
      <div className="mt-6 text-center text-sm text-zinc-500">
        Built by <span className="text-white font-semibold">Cristian Nieto</span> — <a href= "https://github.com/CristianNieto3" className="text-blue-400 underline">GitHub</a>
      </div>
    </main>
  )
}
