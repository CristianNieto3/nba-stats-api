// app/404.tsx
'use client'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white px-6 py-16">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-lg text-zinc-400 mb-6">Oops! Page not found.</p>
      <Link href="/" className="bg-blue-700 hover:bg-blue-600 px-6 py-2 rounded text-white transition-all">
        Go Home
      </Link>
    </main>
  )
}
