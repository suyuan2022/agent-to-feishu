import type { FeishuClient } from "../client/feishu-client.js";

export async function listEvents(
  client: FeishuClient,
  calendarId = "primary",
  startTime?: string,
  endTime?: string,
  pageSize = 50
) {
  const now = new Date();
  const start =
    startTime || new Date(now.getTime() - 7 * 86400000).toISOString();
  const end =
    endTime || new Date(now.getTime() + 30 * 86400000).toISOString();

  const startTs = Math.floor(new Date(start).getTime() / 1000).toString();
  const endTs = Math.floor(new Date(end).getTime() / 1000).toString();

  const res = await client.calendar.v4.calendarEvent.list({
    path: { calendar_id: calendarId },
    params: {
      start_time: startTs,
      end_time: endTs,
      page_size: pageSize,
    },
  });
  return res;
}

export async function createEvent(
  client: FeishuClient,
  calendarId = "primary",
  summary: string,
  startTime: string,
  endTime: string,
  description?: string
) {
  const res = await client.calendar.v4.calendarEvent.create({
    path: { calendar_id: calendarId },
    data: {
      summary,
      description,
      start_time: {
        timestamp: Math.floor(
          new Date(startTime).getTime() / 1000
        ).toString(),
      },
      end_time: {
        timestamp: Math.floor(new Date(endTime).getTime() / 1000).toString(),
      },
    },
  });
  return res;
}

export async function deleteEvent(
  client: FeishuClient,
  calendarId = "primary",
  eventId: string
) {
  const res = await client.calendar.v4.calendarEvent.delete({
    path: { calendar_id: calendarId, event_id: eventId },
  });
  return res;
}
