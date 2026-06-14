const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/notifications');

const router = express.Router();

router.use(authMiddleware);

// GET /api/messages/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM messages
       WHERE receiver_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('unread-count қатесі:', err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/messages/conversations
router.get('/conversations', async (req, res) => {
  const me = req.user.id;
  try {
    const direct = await pool.query(`
      SELECT
        u.id, u.full_name, u.avatar_url, u.group_name,
        (SELECT content FROM messages
         WHERE (sender_id = $1 AND receiver_id = u.id)
            OR (sender_id = u.id AND receiver_id = $1)
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages
         WHERE (sender_id = $1 AND receiver_id = u.id)
            OR (sender_id = u.id AND receiver_id = $1)
         ORDER BY created_at DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*)::int FROM messages
         WHERE sender_id = u.id AND receiver_id = $1 AND is_read = false) AS unread
      FROM users u
      WHERE u.id IN (
        SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
        FROM messages
        WHERE (sender_id = $1 OR receiver_id = $1) AND receiver_id IS NOT NULL
      )
      ORDER BY last_at DESC NULLS LAST
    `, [me]);

    res.json({ conversations: direct.rows });
  } catch (err) {
    console.error('conversations қатесі:', err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/messages/direct/:userId
router.get('/direct/:userId', async (req, res) => {
  const me = req.user.id;
  const other = parseInt(req.params.userId);
  try {
    const result = await pool.query(`
      SELECT m.*,
             u.full_name AS sender_name,
             u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at ASC
      LIMIT 200
    `, [me, other]);

    await pool.query(
      `UPDATE messages SET is_read = true
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [other, me]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('direct GET қатесі:', err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

// POST /api/messages/direct/:userId
router.post('/direct/:userId', async (req, res) => {
  const me = req.user.id;
  const other = parseInt(req.params.userId);
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: 'Хабарлама бос болмауы керек' });
  }
  if (me === other) {
    return res.status(400).json({ message: 'Өзіңізге хат жіберу мүмкін емес' });
  }

  try {
    const check = await pool.query('SELECT id FROM users WHERE id = $1', [other]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Пайдаланушы табылмады' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [me, other, content.trim()]
    );

    pool.query(
      'SELECT telegram_id, full_name FROM users WHERE id = $1',
      [other]
    ).then(async ({ rows }) => {
      const receiver = rows[0];
      if (!receiver?.telegram_id) return;
      const senderInfo = await pool.query('SELECT full_name FROM users WHERE id = $1', [me]);
      const senderName = senderInfo.rows[0]?.full_name || 'Пайдаланушы';
      const preview = content.trim().length > 100
        ? content.trim().slice(0, 100) + '...'
        : content.trim();
      const text = `💬 <b>${senderName}</b> сізге хабарлама жіберді:\n\n${preview}`;
      sendTelegramMessage(receiver.telegram_id, text).catch(() => {});
    }).catch(() => {});

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('direct POST қатесі:', err.message);
    res.status(500).json({ message: 'Хабарлама жіберілмеді: ' + err.message });
  }
});

// GET /api/messages/group/:groupName
router.get('/group/:groupName', async (req, res) => {
  const { groupName } = req.params;
  const me = req.user.id;

  try {
    const myInfo = await pool.query(
      'SELECT group_name, role FROM users WHERE id = $1',
      [me]
    );

    if (!myInfo.rows[0]) {
      return res.status(404).json({ message: 'Пайдаланушы табылмады' });
    }

    const my = myInfo.rows[0];
    const canRead = (my.group_name && my.group_name.trim() === groupName.trim())
      || my.role === 'admin'
      || my.role === 'curator';

    if (!canRead) {
      return res.status(403).json({ message: 'Осы топтың мүшесі емессіз' });
    }

    const result = await pool.query(`
      SELECT m.*,
             u.full_name AS sender_name,
             u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.group_name = $1
      ORDER BY m.created_at ASC
      LIMIT 300
    `, [groupName]);

    let membersReads = [];
    if (result.rows.length > 0) {
      const latestId = result.rows[result.rows.length - 1].id;
      await pool.query(`
        INSERT INTO group_last_reads (group_name, user_id, last_message_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (group_name, user_id) DO UPDATE
        SET last_message_id = GREATEST(group_last_reads.last_message_id, $3),
            updated_at = NOW()
      `, [groupName, me, latestId]).catch(() => {});

      const readsRes = await pool.query(
        'SELECT user_id, last_message_id FROM group_last_reads WHERE group_name = $1',
        [groupName]
      ).catch(() => ({ rows: [] }));
      membersReads = readsRes.rows;
    }

    res.json({ messages: result.rows, group_name: groupName, members_reads: membersReads });
  } catch (err) {
    console.error('group GET қатесі:', err.message);
    res.status(500).json({ message: 'Топтық чат қатесі: ' + err.message });
  }
});

// POST /api/messages/group/:groupName
router.post('/group/:groupName', async (req, res) => {
  const { groupName } = req.params;
  const me = req.user.id;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: 'Хабарлама бос болмауы керек' });
  }

  try {
    const myInfo = await pool.query(
      'SELECT group_name, role FROM users WHERE id = $1',
      [me]
    );

    if (!myInfo.rows[0]) {
      return res.status(404).json({ message: 'Пайдаланушы табылмады' });
    }

    const my = myInfo.rows[0];
    const canWrite = (my.group_name && my.group_name.trim() === groupName.trim())
      || my.role === 'admin'
      || my.role === 'curator';

    if (!canWrite) {
      return res.status(403).json({ message: 'Осы топтың мүшесі емессіз' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, group_name, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [me, groupName.trim(), content.trim()]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error('group POST қатесі:', err.message);
    res.status(500).json({ message: 'Хабарлама жіберілмеді: ' + err.message });
  }
});

// DELETE /api/messages/conversation/:userId
router.delete('/conversation/:userId', async (req, res) => {
  const me = req.user.id;
  const other = parseInt(req.params.userId);
  try {
    await pool.query(
      `DELETE FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [me, other]
    );
    res.json({ message: 'Чат жойылды' });
  } catch (err) {
    console.error('conversation delete қатесі:', err.message);
    res.status(500).json({ message: 'Жою қатесі' });
  }
});

// DELETE /api/messages/:id
// жіберуші өз хатын жоя алады; admin топтық чаттағы кез келген хатты жоя алады
router.delete('/:id', async (req, res) => {
  const me = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const id = parseInt(req.params.id);
  try {
    let result;
    if (isAdmin) {
      result = await pool.query(
        'DELETE FROM messages WHERE id = $1 AND group_name IS NOT NULL RETURNING id',
        [id]
      );
      if (result.rows.length === 0) {
        result = await pool.query(
          'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id',
          [id, me]
        );
      }
    } else {
      result = await pool.query(
        'DELETE FROM messages WHERE id = $1 AND sender_id = $2 RETURNING id',
        [id, me]
      );
    }
    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Жою мүмкін емес' });
    }
    res.json({ message: 'Хабарлама жойылды' });
  } catch (err) {
    console.error('message delete қатесі:', err.message);
    res.status(500).json({ message: 'Жою қатесі' });
  }
});

// GET /api/messages/users?search=
router.get('/users', async (req, res) => {
  const me = req.user.id;
  const { search = '' } = req.query;
  try {
    const result = await pool.query(`
      SELECT id, full_name, avatar_url, group_name, role
      FROM users
      WHERE id != $1
        AND is_active = true
        AND (full_name ILIKE $2 OR email ILIKE $2)
      ORDER BY full_name
      LIMIT 20
    `, [me, `%${search}%`]);
    res.json({ users: result.rows });
  } catch (err) {
    console.error('users search қатесі:', err.message);
    res.status(500).json({ message: 'Қате' });
  }
});

module.exports = router;
