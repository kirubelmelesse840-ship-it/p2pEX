import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as a price with appropriate decimals.
 * - Small numbers (<1) get up to 6 decimals
 * - Large numbers get 2 decimals with thousands separators
 */
export function formatPrice(n: number, opts?: { minDigits?: number; maxDigits?: number }): string {
  if (n == null || isNaN(n)) return '0.00'
  const abs = Math.abs(n)
  let minDigits = opts?.minDigits
  let maxDigits = opts?.maxDigits
  if (minDigits == null && maxDigits == null) {
    if (abs < 0.0001) { minDigits = 6; maxDigits = 8 }
    else if (abs < 0.01) { minDigits = 4; maxDigits = 6 }
    else if (abs < 1) { minDigits = 4; maxDigits = 4 }
    else if (abs < 100) { minDigits = 2; maxDigits = 4 }
    else { minDigits = 2; maxDigits = 2 }
  }
  return n.toLocaleString('en-US', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  })
}

/**
 * Format a quantity (asset amount).
 */
export function formatQty(n: number, maxDigits = 6): string {
  if (n == null || isNaN(n)) return '0'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  })
}

/**
 * Format large numbers with abbreviations (K, M, B).
 */
export function formatCompact(n: number): string {
  if (n == null || isNaN(n)) return '0'
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Format a USD value.
 */
export function formatUsd(n: number): string {
  return '$' + formatPrice(n, { minDigits: 2, maxDigits: 2 })
}

/**
 * Format a percentage with sign.
 */
export function formatPercent(n: number, decimals = 2): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}%`
}

/**
 * Format a date/time.
 */
export function formatTime(ts: number | Date): string {
  const d = typeof ts === 'number' ? new Date(ts) : ts
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function formatDateTime(ts: number | Date | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : typeof ts === 'number' ? new Date(ts) : ts
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/**
 * Shorten an address.
 */
export function shortAddr(addr: string, prefix = 6, suffix = 4): string {
  if (!addr) return ''
  if (addr.length <= prefix + suffix) return addr
  return `${addr.slice(0, prefix)}...${addr.slice(-suffix)}`
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

