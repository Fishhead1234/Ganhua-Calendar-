import { CalendarMeeting } from './calendarRoastService';

/**
 * Lightweight RFC 5545 iCalendar (.ics) parser
 * Parses today's events from an iCal string into CalendarMeeting objects
 */

export function parseICSForToday(icsContent: string, targetDate: Date = new Date()): CalendarMeeting[] {
  const meetings: CalendarMeeting[] = [];
  
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  // Normalize line folding (RFC 5545 lines starting with space or tab continue previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let currentEvent: {
    summary?: string;
    dtstart?: string;
    dtend?: string;
    durationMinutes?: number;
  } = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.dtstart) {
        const parsedStart = parseIcsDateTime(currentEvent.dtstart);
        if (parsedStart) {
          // Check if event occurs today
          if (
            parsedStart.getFullYear() === targetYear &&
            parsedStart.getMonth() === targetMonth &&
            parsedStart.getDate() === targetDay
          ) {
            let durationMinutes = 60; // default 1 hour
            if (currentEvent.dtend) {
              const parsedEnd = parseIcsDateTime(currentEvent.dtend);
              if (parsedEnd) {
                durationMinutes = Math.max(15, Math.round((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60)));
              }
            } else if (currentEvent.durationMinutes) {
              durationMinutes = currentEvent.durationMinutes;
            }

            const startHour = parsedStart.getHours();
            const startMinute = parsedStart.getMinutes();
            const isFridayAfterFour = targetDate.getDay() === 5 && (startHour >= 16 || (startHour === 15 && startMinute >= 45));

            meetings.push({
              id: `ics-${meetings.length + 1}-${Date.now()}`,
              title: currentEvent.summary || '未命名會議',
              startHour,
              startMinute,
              durationMinutes,
              isFridayAfterFour,
            });
          }
        }
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.substring(8).replace(/\\,/g, ',').replace(/\\;/g, ';');
    } else if (line.startsWith('DTSTART')) {
      const val = line.split(':')[1];
      if (val) currentEvent.dtstart = val.trim();
    } else if (line.startsWith('DTEND')) {
      const val = line.split(':')[1];
      if (val) currentEvent.dtend = val.trim();
    }
  }

  // Sort chronologically by start time
  meetings.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));

  return meetings;
}

function parseIcsDateTime(dateStr: string): Date | null {
  // Format examples: 20261030T093000Z or 20261030T093000 or 20261030
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 0;
  const minute = match[5] ? parseInt(match[5], 10) : 0;
  const second = match[6] ? parseInt(match[6], 10) : 0;
  const isUtc = Boolean(match[7]);

  if (isUtc) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  return new Date(year, month, day, hour, minute, second);
}

/**
 * Fetch and parse ICS from an iCal subscription link
 */
export async function fetchAndParseIcs(url: string, targetDate: Date = new Date()): Promise<CalendarMeeting[]> {
  const cleanUrl = url.trim().replace(/^webcal:\/\//i, 'https://');
  
  // Try direct fetch first
  try {
    const res = await fetch(cleanUrl, { mode: 'cors' });
    if (res.ok) {
      const text = await res.text();
      return parseICSForToday(text, targetDate);
    }
  } catch {
    // If blocked by browser CORS, use a reliable public proxy
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const text = await proxyRes.text();
        return parseICSForToday(text, targetDate);
      }
    } catch (e) {
      console.error('Failed to fetch via proxy:', e);
    }
  }

  throw new Error('無法取得行事曆資料，請檢查網址是否為公開或私人 iCal/ICS 訂閱連結。');
}

