export interface BlockSegment {
  leftPct: number;
  widthPct: number;
  startMin: number;
  endMin: number;
}

export function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function formatMins(totalMins: number): string {
  const m = ((Math.floor(totalMins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${pad(h)}:${pad(min)}`;
}

export function getSegmentsInTimezone(startIst: number, endIst: number, offsetMinutes: number): BlockSegment[] {
  const startTz = ((startIst + offsetMinutes) % 1440 + 1440) % 1440;
  const duration = endIst - startIst;
  const endTz = startTz + duration;

  if (endTz <= 1440) {
    return [
      {
        leftPct: (startTz / 1440) * 100,
        widthPct: (duration / 1440) * 100,
        startMin: startTz,
        endMin: endTz
      }
    ];
  } else {
    // Crosses midnight: split into 2 visual segments
    const seg1Width = 1440 - startTz;
    const seg2Width = endTz - 1440;
    return [
      {
        leftPct: (startTz / 1440) * 100,
        widthPct: (seg1Width / 1440) * 100,
        startMin: startTz,
        endMin: 1440
      },
      {
        leftPct: 0,
        widthPct: (seg2Width / 1440) * 100,
        startMin: 0,
        endMin: seg2Width
      }
    ];
  }
}

export function getTzOffsetMinutesFromIST(iana: string): number {
  const now = new Date();
  const istStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const targetStr = now.toLocaleString('en-US', { timeZone: iana });
  const diffMs = new Date(targetStr).getTime() - new Date(istStr).getTime();
  return Math.round(diffMs / 60000);
}

export function getLiveTime(iana: string) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long'
  });
  const parts = formatter.formatToParts(now);
  const getVal = (type: string) => parts.find(p => p.type === type)?.value || '';

  let hours = parseInt(getVal('hour'), 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(getVal('minute'), 10);
  const seconds = parseInt(getVal('second'), 10);
  const day = getVal('weekday').toUpperCase();

  return {
    hours,
    minutes,
    seconds,
    totalMinutes: hours * 60 + minutes,
    day
  };
}

export function formatIntervalInTz(startIst: number, endIst: number, offsetMinutes: number, tzShort: string): string {
  const s = (startIst + offsetMinutes + 1440) % 1440;
  const e = (endIst + offsetMinutes + 1440) % 1440;
  return `${formatMins(s)} – ${formatMins(e)} ${tzShort}`;
}
