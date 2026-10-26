import React, { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export const Header: React.FC = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  return (
    <header className="w-full max-w-xl mx-auto pt-8 pb-4 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 shadow-sm" />
          <div className="absolute w-3 h-3 rounded-full bg-indigo-500/40 animate-ping" />
        </div>
        <span className="font-extrabold text-lg tracking-widest text-zinc-900 dark:text-white font-mono">
          TER
        </span>
      </div>

      <button
        onClick={toggleTheme}
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 transition-all duration-200"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  )
}
