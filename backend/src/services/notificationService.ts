import { Response } from 'express';
import { query } from '../config/db';

const activeClients = new Map<number, Response[]>();

export const registerClient = (userId: number, res: Response) => {
  if (!activeClients.has(userId)) {
    activeClients.set(userId, []);
  }
  activeClients.get(userId)!.push(res);
  console.log(
    `[SSE] Registered stream client for User ID: ${userId}. Active streams count: ${activeClients.get(userId)!.length}`,
  );
};

export const unregisterClient = (userId: number, res: Response) => {
  const clients = activeClients.get(userId);
  if (clients) {
    const idx = clients.indexOf(res);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
    if (clients.length === 0) {
      activeClients.delete(userId);
    }
  }
  console.log(`[SSE] Unregistered stream client for User ID: ${userId}`);
};

export const createNotification = async (userId: number, type: string, message: string) => {
  // 1. Write notification record to SQLite/PostgreSQL
  await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
    userId,
    type,
    message,
  ]);

  // 2. Fetch the newly written record to obtain the auto-generated ID/is_read/created_at fields
  const fetchRes = await query(
    'SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    [userId],
  );

  const notification = fetchRes.rows[0];

  // 3. Broadcast real-time SSE event to all open connections of this user
  const clients = activeClients.get(userId);
  if (clients && clients.length > 0) {
    const dataStr = `data: ${JSON.stringify(notification)}\n\n`;
    clients.forEach((client) => {
      try {
        client.write(dataStr);
      } catch (err) {
        console.error(
          `[SSE] Failed writing push notification to client stream for user ${userId}:`,
          err,
        );
      }
    });
  }

  return notification;
};
