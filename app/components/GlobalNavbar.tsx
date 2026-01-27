'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GlobalNavbar() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        const initialTheme = savedTheme || systemTheme
        setTheme(initialTheme)
        document.documentElement.classList.toggle('dark', initialTheme === 'dark')

        const handleScroll = () => setIsScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }

    return (
        <nav className={cn(
            "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
            isScrolled && "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800",
            !isScrolled && "bg-transparent" // Optional: force transparent at top
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <Link href="/" className="relative h-8 w-32 md:h-10 md:w-40 block">
                            <Image
                                src="/assets/images/nillarpay-black.png"
                                alt="NillarPay"
                                fill
                                className="object-contain object-left dark:hidden"
                                priority
                            />
                            <Image
                                src="/assets/images/nillarpay-white.png"
                                alt="NillarPay"
                                fill
                                className="object-contain object-left hidden dark:block"
                                priority
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={toggleTheme} className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                        <Link href="/#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">Features</Link>
                        <Link href="/pricing" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">Pricing</Link>
                        <Link href="/auth/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">Log in</Link>
                        <Link href="/auth/register" className="text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
                            Get Started
                        </Link>
                    </div>

                    <div className="md:hidden">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-zinc-900 dark:text-white">
                            {mobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
                    <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">Features</Link>
                    <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">Pricing</Link>
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-3">
                        <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="text-center w-full py-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg text-sm font-medium">Log in</Link>
                        <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)} className="text-center w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium">Create Account</Link>
                    </div>
                </div>
            )}
        </nav>
    )
}
