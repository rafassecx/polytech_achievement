const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// GET /api/stats/summary
router.get('/summary', async (req, res) => {
  try {
    const [approved, students, thisMonth, topCat] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM achievements WHERE status = 'approved'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'student' AND is_active = true`),
      pool.query(`
        SELECT COUNT(*)::int AS count FROM achievements
        WHERE status = 'approved'
          AND created_at >= date_trunc('month', CURRENT_DATE)
      `),
      pool.query(`
        SELECT category, COUNT(*) AS cnt
        FROM achievements WHERE status = 'approved'
        GROUP BY category ORDER BY cnt DESC LIMIT 1
      `),
    ]);

    res.json({
      total_approved: approved.rows[0].count,
      total_students: students.rows[0].count,
      this_month:     thisMonth.rows[0].count,
      top_category:   topCat.rows[0]?.category || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

// GET /api/stats/leaderboard?limit=10&group=P22-2B
router.get('/leaderboard', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const group = req.query.group || null;

  try {
    const params = [limit];
    let groupFilter = '';
    if (group) {
      params.push(group);
      groupFilter = `AND u.group_name = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.avatar_url,
        u.group_name,
        COUNT(a.id)::int AS total,
        COUNT(a.id) FILTER (WHERE a.category = 'academic')::int  AS academic,
        COUNT(a.id) FILTER (WHERE a.category = 'sport')::int     AS sport,
        COUNT(a.id) FILTER (WHERE a.category = 'cultural')::int  AS cultural,
        COUNT(a.id) FILTER (WHERE a.category = 'social')::int    AS social,
        COUNT(a.id) FILTER (WHERE a.category = 'other')::int     AS other
      FROM users u
      LEFT JOIN achievements a ON a.user_id = u.id AND a.status = 'approved'
      WHERE u.role = 'student' AND u.is_active = true ${groupFilter}
      GROUP BY u.id
      HAVING COUNT(a.id) > 0
      ORDER BY total DESC
      LIMIT $1
    `, params);

    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Қате' });
  }
});

module.exports = router;
