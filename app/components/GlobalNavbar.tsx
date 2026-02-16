'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Sun, Moon, LayoutDashboard } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function GlobalNavbar() {
    const { data: session } = useSession()
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
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
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        localStorage.setItem('theme', newTheme)
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }

    const navLinks = [
        { label: 'Home', href: '/' },
        { label: 'About Us', href: '/about' },
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Help Center', href: '/help' },
    ]

    return (
        <React.Fragment>
            {/* Desktop Modern Pill Navbar */}
            <div className={`hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-4 transition-all duration-300 ${isScrolled ? 'top-2 scale-95' : 'top-6'}`}>
                <nav className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg flex items-center justify-between p-2 pl-6">
                    {/* Logo Area */}
                    <Link href="/" className="relative h-8 w-32 block mr-8 shrink-0">
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

                    <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-full transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        {session ? (
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-sm font-semibold rounded-full transition-all shadow-md hover:shadow-lg transform active:scale-95"
                            >
                                <span>Dashboard</span>
                                <LayoutDashboard size={16} />
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth/login"
                                    className="hidden lg:flex px-5 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                                >
                                    Log In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-full transition-all shadow-md hover:shadow-lg shadow-blue-500/20 active:scale-95"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>
            </div>

            {/* Mobile Navbar */}
            <div className="md:hidden fixed top-0 w-full z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
                <Link href="/" className="relative h-8 w-32 block">
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

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-zinc-500 dark:text-zinc-400"
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-zinc-800 dark:text-zinc-100"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>


            {/* Mobile Menu Sidebar */}
            {mobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    
                    {/* Sidebar Content */}
                    <div className="fixed inset-y-0 left-0 z-50 w-[75%] max-w-sm bg-white dark:bg-zinc-950 shadow-2xl p-6 flex flex-col gap-6 md:hidden animate-in slide-in-from-left duration-300 ease-out border-r border-zinc-200 dark:border-zinc-800">
                        {/* Sidebar Header */}
                        <div className="flex items-center justify-between">
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="relative h-8 w-32 block">
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
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex flex-col gap-1 mt-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-base font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 py-3 px-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                        
                        <div className="mt-auto border-t border-zinc-100 dark:border-zinc-800 pt-6 flex flex-col gap-3">
                            {session ? (
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl text-center shadow-lg shadow-zinc-200 dark:shadow-none"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full py-3 text-center text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href="/auth/register"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-center shadow-lg shadow-blue-500/20 transition-colors"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </React.Fragment>
    )
}
