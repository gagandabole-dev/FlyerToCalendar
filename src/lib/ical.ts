import ical, { ICalCalendarMethod } from 'ical-generator';

export function generateRFC5545Calendar(eventName: string, events: any[]) {
  const calendar = ical({
    name: `${eventName} - Schedule`,
    method: ICalCalendarMethod.PUBLISH,
    timezone: 'Europe/Berlin',
  });

  events.forEach((evt) => {
    calendar.createEvent({
      id: evt.id,
      start: new Date(evt.start_time || evt.startTime),
      end: new Date(evt.end_time || evt.endTime),
      summary: evt.artist ? `${evt.title} - ${evt.artist}` : evt.title,
      location: evt.room || 'Main Stage',
      timezone: 'Europe/Berlin',
    });
  });

  return calendar.toString();
}
