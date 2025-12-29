'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function GlobalFooter() {
    return (
        <footer className="bg-zinc-50 dark:bg-zinc-950 py-16 border-t border-zinc-200 dark:border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    <div className="col-span-2 text-sm">
                        <div className="relative h-6 w-24 mb-4">
                            <Image
                                src="/assets/images/nillarpay-black.png"
                                alt="NillarPay"
                                fill
                                className="object-contain object-left dark:hidden"
                            />
                            <Image
                                src="/assets/images/nillarpay-white.png"
                                alt="NillarPay"
                                fill
                                className="object-contain object-left hidden dark:block"
                            />
                        </div>
                        <p className="text-zinc-500 max-w-xs">
                            The modern standard for VTU and bill payments in Nigeria. Fast, secure, and reliable.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Product</h4>
                        <Link href="/#features" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Features</Link>
                        <Link href="/#pricing" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Pricing</Link>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">API Documentation</Link>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Company</h4>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">About</Link>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Blog</Link>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Careers</Link>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="font-semibold text-zinc-900 dark:text-white">Legal</h4>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Terms of Service</Link>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Privacy Policy</Link>
                        <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300">Cookie Policy</Link>
                    </div>
                </div>

                <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-zinc-500">
                        © {new Date().getFullYear()} NillarPay. All rights reserved.
                    </div>
                    <div className="flex gap-6">
                        {/* Social Icons Placeholder */}
                    </div>
                </div>
            </div>
        </footer>
    )
}
