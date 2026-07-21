import { Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { receiverId, content, attachmentUrl } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!receiverId || !content) {
    return res.status(400).json({ error: 'Receiver ID and content are required' });
  }

  try {
    // Check if receiver exists
    const recRes = await query('SELECT id, role, username FROM users WHERE id = $1', [receiverId]);
    if (recRes.rows.length === 0) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const senderRole = req.user.role;
    const receiverRole = recRes.rows[0].role;

    // Validate messaging rules (e.g. Student <-> Provider, Admin <-> Provider, Admin <-> Admin/Student maybe)
    // The prompt says: Student ↔ Provider, Provider ↔ Admin, Admin ↔ Provider.
    const isAllowed =
      (senderRole === 'student' && receiverRole === 'provider') ||
      (senderRole === 'provider' && receiverRole === 'student') ||
      (senderRole === 'provider' && receiverRole === 'admin') ||
      (senderRole === 'admin' && receiverRole === 'provider') ||
      (senderRole === 'admin' && receiverRole === 'admin'); // Admins can talk to each other

    if (!isAllowed) {
      return res.status(403).json({
        error: `Messaging between ${senderRole} and ${receiverRole} is not permitted by communication rules.`,
      });
    }

    await query(
      'INSERT INTO messages (sender_id, receiver_id, content, attachment_url) VALUES ($1, $2, $3, $4)',
      [req.user.id, receiverId, content, attachmentUrl || null],
    );

    // Notify the receiver
    await query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [
      receiverId,
      'message',
      `New message from ${req.user.username}: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`,
    ]);

    return res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { otherUserId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch conversation messages
    const msgsRes = await query(
      `SELECT m.*, 
              su.username as sender_name, su.role as sender_role,
              ru.username as receiver_name, ru.role as receiver_role
       FROM messages m
       JOIN users su ON m.sender_id = su.id
       JOIN users ru ON m.receiver_id = ru.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [req.user.id, otherUserId],
    );

    return res.json(msgsRes.rows);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch unique conversation threads.
    // Query users that have sent or received messages from current user.
    const convsRes = await query(
      `SELECT DISTINCT u.id, u.username, u.role,
         -- Get details of the provider or student profile if applicable
         p.name as provider_name, s.name as student_name
       FROM users u
       LEFT JOIN providers p ON u.id = p.user_id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE u.id IN (
         SELECT sender_id FROM messages WHERE receiver_id = $1
         UNION
         SELECT receiver_id FROM messages WHERE sender_id = $1
       )`,
      [req.user.id],
    );

    const conversations = [];

    for (const otherUser of convsRes.rows) {
      // Get the last message in this thread
      const lastMsgRes = await query(
        `SELECT content, created_at, sender_id, read_at
         FROM messages
         WHERE (sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1)
         ORDER BY created_at DESC LIMIT 1`,
        [req.user.id, otherUser.id],
      );

      // Get unread count
      const unreadRes = await query(
        `SELECT COUNT(*) as count 
         FROM messages 
         WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
        [otherUser.id, req.user.id],
      );

      const displayName =
        otherUser.role === 'provider'
          ? `Dr. ${otherUser.provider_name || otherUser.username}`
          : otherUser.role === 'student'
            ? otherUser.student_name || otherUser.username
            : `Admin (${otherUser.username})`;

      conversations.push({
        id: otherUser.id,
        username: otherUser.username,
        role: otherUser.role,
        displayName,
        lastMessage: lastMsgRes.rows[0]?.content || '',
        lastMessageSenderId: lastMsgRes.rows[0]?.sender_id || null,
        lastMessageTime: lastMsgRes.rows[0]?.created_at || null,
        unreadCount: parseInt(unreadRes.rows[0]?.count || '0'),
      });
    }

    // Sort by last message time
    conversations.sort((a, b) => {
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return bTime - aTime;
    });

    return res.json(conversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const { otherUserId } = req.params;

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await query(
      `UPDATE messages 
       SET read_at = CURRENT_TIMESTAMP 
       WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
      [otherUserId, req.user.id],
    );

    return res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark as read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Search users available to chat with based on role
export const getAvailableContacts = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const role = req.user.role;

  try {
    let sql = '';
    const params: any[] = [];

    if (role === 'student') {
      // Students can search Providers
      sql = `
        SELECT u.id, u.username, u.role, p.name as display_name, p.specialization 
        FROM users u
        JOIN providers p ON u.id = p.user_id
        WHERE u.role = 'provider'
      `;
    } else if (role === 'provider') {
      // Providers can search Students and Admins
      sql = `
        SELECT u.id, u.username, u.role, s.name as display_name, s.registration_number as details
        FROM users u
        JOIN students s ON u.id = s.user_id
        WHERE u.role = 'student'
        UNION
        SELECT u.id, u.username, u.role, 'System Administrator' as display_name, '' as details
        FROM users u
        WHERE u.role = 'admin'
      `;
    } else if (role === 'admin') {
      // Admins can search Providers
      sql = `
        SELECT u.id, u.username, u.role, p.name as display_name, p.specialization as details
        FROM users u
        JOIN providers p ON u.id = p.user_id
        WHERE u.role = 'provider'
      `;
    }

    const dbRes = await query(sql, params);
    return res.json(dbRes.rows);
  } catch (err) {
    console.error('Get available contacts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
