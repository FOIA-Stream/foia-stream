/**
 * @file CIDR Range Banlist Service
 * @module services/cidr-banlist
 * @author FOIA Stream Team
 * @description Provides IP range-based banning using CIDR notation.
 *              Supports both IPv4 and IPv6 address ranges for comprehensive network blocking.
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection) - GAP-007
 * @compliance ISO 27001 A.8.6 (Capacity Management)
 * @compliance CMMC 3.13.13 (Network Communication Protection)
 */

import { Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * CIDR Entry Schema
 */
const CIDREntrySchema = S.Struct({
  cidr: S.String,
  reason: S.optional(S.String),
  timestamp: S.Number,
  bannedBy: S.optional(S.String),
});

export type CIDREntry = typeof CIDREntrySchema.Type;

/**
 * CIDR Stats Schema
 */
const CIDRStatsSchema = S.Struct({
  totalRanges: S.Number,
  ipv4Ranges: S.Number,
  ipv6Ranges: S.Number,
  entries: S.Array(CIDREntrySchema),
});

export type CIDRStats = typeof CIDRStatsSchema.Type;

// ============================================
// IPv4/IPv6 Utilities
// ============================================

/**
 * Parse IPv4 address to numeric value
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (Number.isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) + num;
  }
  return result >>> 0; // Ensure unsigned
}

/**
 * Parse IPv6 address to BigInt
 */
function ipv6ToBigInt(ip: string): bigint | null {
  // Expand :: shorthand
  let expanded = ip;
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0');
    expanded = [...left, ...middle, ...right].join(':');
  }

  const parts = expanded.split(':');
  if (parts.length !== 8) return null;

  let result = BigInt(0);
  for (const part of parts) {
    const num = parseInt(part || '0', 16);
    if (Number.isNaN(num) || num < 0 || num > 0xffff) return null;
    result = (result << BigInt(16)) + BigInt(num);
  }
  return result;
}

/**
 * Check if an IP is IPv6
 */
function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/**
 * Check if an IPv4 address is in a CIDR range
 */
function ipv4InCIDR(ip: string, cidr: string): boolean {
  const [range, prefixStr] = cidr.split('/');
  if (!range || !prefixStr) return false;

  const prefix = parseInt(prefixStr, 10);
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = ipv4ToNumber(ip);
  const rangeNum = ipv4ToNumber(range);

  if (ipNum === null || rangeNum === null) return false;

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Check if an IPv6 address is in a CIDR range
 */
function ipv6InCIDR(ip: string, cidr: string): boolean {
  const [range, prefixStr] = cidr.split('/');
  if (!range || !prefixStr) return false;

  const prefix = parseInt(prefixStr, 10);
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 128) return false;

  const ipBigInt = ipv6ToBigInt(ip);
  const rangeBigInt = ipv6ToBigInt(range);

  if (ipBigInt === null || rangeBigInt === null) return false;

  const mask = prefix === 0 ? BigInt(0) : ~(BigInt(1) << BigInt(128 - prefix)) + BigInt(1);
  return (ipBigInt & mask) === (rangeBigInt & mask);
}

/**
 * Check if IP is in CIDR range (auto-detects IPv4/IPv6)
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const ipIsV6 = isIPv6(ip);
  const cidrIsV6 = isIPv6(cidr.split('/')[0] ?? '');

  // Must be same IP version
  if (ipIsV6 !== cidrIsV6) return false;

  return ipIsV6 ? ipv6InCIDR(ip, cidr) : ipv4InCIDR(ip, cidr);
}

/**
 * Validate CIDR notation
 */
function isValidCIDR(cidr: string): boolean {
  const [range, prefixStr] = cidr.split('/');
  if (!range || !prefixStr) return false;

  const prefix = parseInt(prefixStr, 10);
  if (Number.isNaN(prefix)) return false;

  if (isIPv6(range)) {
    if (prefix < 0 || prefix > 128) return false;
    return ipv6ToBigInt(range) !== null;
  } else {
    if (prefix < 0 || prefix > 32) return false;
    return ipv4ToNumber(range) !== null;
  }
}

// ============================================
// CIDR Store
// ============================================

class CIDRBanlistStore {
  private bannedRanges = new Map<string, CIDREntry>();

  /**
   * Check if an IP is in any banned CIDR range
   */
  isIPBanned(ip: string): boolean {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return false;
    }

    for (const [cidr] of this.bannedRanges) {
      try {
        if (isIPInCIDR(ip, cidr)) {
          return true;
        }
      } catch {
        // Invalid CIDR, skip
      }
    }

    return false;
  }

  /**
   * Get the CIDR range that banned an IP
   */
  getMatchingCIDR(ip: string): string | null {
    for (const [cidr] of this.bannedRanges) {
      try {
        if (isIPInCIDR(ip, cidr)) {
          return cidr;
        }
      } catch {
        // Invalid CIDR, skip
      }
    }
    return null;
  }

  /**
   * Ban a CIDR range
   */
  banCIDR(
    cidr: string,
    options?: {
      reason?: string;
      bannedBy?: string;
    },
  ): boolean {
    if (!isValidCIDR(cidr)) {
      return false;
    }

    const entry: CIDREntry = {
      cidr,
      reason: options?.reason,
      timestamp: Date.now(),
      bannedBy: options?.bannedBy,
    };

    this.bannedRanges.set(cidr, entry);
    return true;
  }

  /**
   * Unban a CIDR range
   */
  unbanCIDR(cidr: string): boolean {
    return this.bannedRanges.delete(cidr);
  }

  /**
   * Get entry for a CIDR range
   */
  getCIDREntry(cidr: string): CIDREntry | null {
    return this.bannedRanges.get(cidr) ?? null;
  }

  /**
   * Get all banned CIDR ranges
   */
  getBannedCIDRs(): string[] {
    return Array.from(this.bannedRanges.keys());
  }

  /**
   * Get statistics
   */
  getStats(): CIDRStats {
    const entries = Array.from(this.bannedRanges.values());

    let ipv4Count = 0;
    let ipv6Count = 0;

    for (const entry of entries) {
      if (isIPv6(entry.cidr.split('/')[0] ?? '')) {
        ipv6Count++;
      } else {
        ipv4Count++;
      }
    }

    return {
      totalRanges: entries.length,
      ipv4Ranges: ipv4Count,
      ipv6Ranges: ipv6Count,
      entries,
    };
  }

  /**
   * Clear all banned ranges
   */
  clear(): void {
    this.bannedRanges.clear();
  }
}

// Global store instance
const cidrStore = new CIDRBanlistStore();

// ============================================
// Exported Functions
// ============================================

/**
 * Check if an IP is in any banned CIDR range
 */
export function isIPInBannedCIDR(ip: string): boolean {
  return cidrStore.isIPBanned(ip);
}

/**
 * Get the CIDR range that matches an IP
 */
export function getMatchingBannedCIDR(ip: string): string | null {
  return cidrStore.getMatchingCIDR(ip);
}

/**
 * Ban a CIDR range
 */
export function banCIDRRange(
  cidr: string,
  options?: {
    reason?: string;
    bannedBy?: string;
  },
): boolean {
  return cidrStore.banCIDR(cidr, options);
}

/**
 * Unban a CIDR range
 */
export function unbanCIDRRange(cidr: string): boolean {
  return cidrStore.unbanCIDR(cidr);
}

/**
 * Get entry for a CIDR range
 */
export function getCIDREntry(cidr: string): CIDREntry | null {
  return cidrStore.getCIDREntry(cidr);
}

/**
 * Get all banned CIDR ranges
 */
export function getBannedCIDRRanges(): string[] {
  return cidrStore.getBannedCIDRs();
}

/**
 * Get CIDR banlist statistics
 */
export function getCIDRStats(): CIDRStats {
  return cidrStore.getStats();
}

/**
 * Clear all banned CIDR ranges
 */
export function clearCIDRBanlist(): void {
  cidrStore.clear();
}

/**
 * Validate CIDR notation
 */
export { isValidCIDR };

// Export schemas
export { CIDREntrySchema, CIDRStatsSchema };
