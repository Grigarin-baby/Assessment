import { Injectable } from '@nestjs/common';

@Injectable()
export class DateNormalizerService {
  /**
   * Normalizes a raw date input into a canonical JavaScript Date object.
   * Returns null if the date is unparseable, out of reasonable bounds, or logically invalid.
   */
  normalize(rawDate: unknown): Date | null {
    if (rawDate === undefined || rawDate === null || rawDate === '') {
      return null;
    }

    // 1. Handle numeric timestamps (Unix Epoch in seconds or milliseconds)
    if (typeof rawDate === 'number') {
      return this.parseNumericEpoch(rawDate);
    }

    // 2. Handle string inputs
    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (!trimmed) {
        return null;
      }

      // Check if string is purely numeric digits (stringified epoch)
      if (/^\d{9,13}$/.test(trimmed)) {
        const num = Number(trimmed);
        return this.parseNumericEpoch(num);
      }

      // Check strict calendar validity for ISO / YYYY-MM-DD patterns to prevent JS month rollover
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10);
        const day = parseInt(isoMatch[3], 10);

        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        // Validate days in specific month (including leap years)
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        if (day > daysInMonth) {
          return null;
        }
      }

      // Attempt parsing via standard Date constructor
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) {
        return null;
      }

      const year = parsed.getUTCFullYear();
      // Bound sanity check (reasonable timeline: 1970 to 2100)
      if (year < 1970 || year > 2100) {
        return null;
      }

      return parsed;
    }

    // 3. Handle already parsed Date instance
    if (rawDate instanceof Date) {
      if (isNaN(rawDate.getTime())) {
        return null;
      }
      return rawDate;
    }

    return null;
  }

  private parseNumericEpoch(epoch: number): Date | null {
    if (!Number.isFinite(epoch) || epoch <= 0) {
      return null;
    }

    // If 10-digit number, epoch is in seconds
    // If 13-digit number, epoch is in milliseconds
    const ms = epoch < 10000000000 ? epoch * 1000 : epoch;
    const date = new Date(ms);

    if (isNaN(date.getTime())) {
      return null;
    }

    const year = date.getUTCFullYear();
    if (year < 1970 || year > 2100) {
      return null;
    }

    return date;
  }
}
