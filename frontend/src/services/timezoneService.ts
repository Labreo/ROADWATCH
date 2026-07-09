import { getActiveTemplate, getActiveRegion } from './regionAwareFormat';

const REGION_TIMEZONES: Record<string, string> = {
  IN: 'Asia/Kolkata',
  US: 'America/Detroit',
  GB: 'Europe/London',
  KE: 'Africa/Nairobi',
};

export function getRegionTimezone(regionCode?: string): string {
  if (regionCode && REGION_TIMEZONES[regionCode]) {
    return REGION_TIMEZONES[regionCode];
  }
  const template = getActiveTemplate();
  return template.timezone || 'Asia/Kolkata';
}

export function formatInRegionTime(
  isoString: string | null | undefined,
  regionCode?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoString) return '—';
  const tz = getRegionTimezone(regionCode);
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatInRegionDate(
  isoString: string | null | undefined,
  regionCode?: string
): string {
  if (!isoString) return '—';
  const tz = getRegionTimezone(regionCode);
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatInRegionTimeShort(
  isoString: string | null | undefined,
  regionCode?: string
): string {
  if (!isoString) return '—';
  const tz = getRegionTimezone(regionCode);
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function getRelativeTime(isoString: string | null | undefined, regionCode?: string): string {
  if (!isoString) return '—';
  const tz = getRegionTimezone(regionCode);
  try {
    const date = new Date(isoString);
    const now = new Date();
    const nowTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const dateTz = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const diffMs = nowTz.getTime() - dateTz.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatInRegionDate(isoString, regionCode);
  } catch {
    return isoString;
  }
}

export function getCurrentTimeInRegion(regionCode?: string): string {
  const tz = getRegionTimezone(regionCode);
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  } catch {
    return '--:--:--';
  }
}

export function getRegionTimeWithOffset(regionCode?: string): { time: string; offset: string } {
  const tz = getRegionTimezone(regionCode);
  try {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const offsetMin = -now.getTimezoneOffset();
    const tzOffset = now.toLocaleString('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const offsetMatch = tzOffset.match(/([+-]\d{2}:\d{2}|UTC|GMT|EST|EDT|CST|CDT|BST|EAT)/);
    const offset = offsetMatch ? offsetMatch[1] : `UTC${offsetMin >= 0 ? '+' : ''}${Math.floor(offsetMin / 60)}`;

    return { time, offset };
  } catch {
    return { time: '--:--', offset: 'UTC' };
  }
}

export function getAllRegionTimes(): { code: string; name: string; time: string; offset: string }[] {
  const regionNames: Record<string, string> = {
    IN: 'India',
    US: 'Michigan',
    GB: 'London',
    KE: 'Nairobi',
  };
  return Object.keys(REGION_TIMEZONES).map((code) => {
    const { time, offset } = getRegionTimeWithOffset(code);
    return {
      code,
      name: regionNames[code] || code,
      time,
      offset,
    };
  });
}

export function isDaytime(regionCode?: string): boolean {
  const tz = getRegionTimezone(regionCode);
  try {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
      10
    );
    return hour >= 6 && hour < 18;
  } catch {
    return true;
  }
}
