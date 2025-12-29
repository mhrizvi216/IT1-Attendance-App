'use client'

import { useState, useEffect } from 'react'

export default function DateTimeDisplay() {
    const [mounted, setMounted] = useState(false)
    const [date, setDate] = useState<Date | null>(null)

    useEffect(() => {
        setMounted(true)
        setDate(new Date())

        const timer = setInterval(() => {
            setDate(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    if (!mounted || !date) return null

    return (
        <div className="hidden md:flex flex-col items-end mr-4 text-sm">
            <div className="font-semibold text-gray-700">
                {date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                })}
            </div>
            <div className="text-gray-500 font-medium tabular-nums">
                {date.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}
            </div>
        </div>
    )
}
