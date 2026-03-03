const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/sangh - List groups: public groups + groups user is a member of.
 * Paginated; no duplicate fetches.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(5, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const { data: memberships } = await supabase
      .from('sangh_members')
      .select('sangh_id')
      .eq('user_id', userId);

    const mySanghIds = (memberships || []).map((m) => m.sangh_id);

    let query = supabase
      .from('sanghs')
      .select('*, creator:users(id, name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (mySanghIds.length > 0) {
      query = query.or(`is_public.eq.true,id.in.(${mySanghIds.join(',')})`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data: sanghs, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const list = (sanghs || []).map((s) => ({
      ...s,
      isMember: mySanghIds.includes(s.id),
      memberCount: null,
    }));

    const sanghIds = list.map((s) => s.id);
    if (sanghIds.length > 0) {
      const { data: counts } = await supabase
        .from('sangh_members')
        .select('sangh_id')
        .in('sangh_id', sanghIds);
      const countMap = {};
      (counts || []).forEach((r) => {
        countMap[r.sangh_id] = (countMap[r.sangh_id] || 0) + 1;
      });
      list.forEach((s) => {
        s.memberCount = countMap[s.id] || 0;
      });
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      sanghs: list,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sangh - Create a group (sangh). Creator is added as member.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, is_public } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: sangh, error: insertError } = await supabase
      .from('sanghs')
      .insert([
        {
          name: name.trim().slice(0, 120),
          description: description ? String(description).trim().slice(0, 2000) : null,
          is_public: !!is_public,
          created_by: userId,
        },
      ])
      .select('*, creator:users(id, name)')
      .single();

    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    await supabase.from('sangh_members').insert([{ sangh_id: sangh.id, user_id: userId }]);

    res.status(201).json({
      sangh: { ...sangh, isMember: true, memberCount: 1 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sangh/:id - Get one group by id. Returns 404 if private and user not member.
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data: sangh, error } = await supabase
      .from('sanghs')
      .select('*, creator:users(id, name)')
      .eq('id', id)
      .single();

    if (error || !sangh) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!sangh.is_public) {
      const { data: mem } = await supabase
        .from('sangh_members')
        .select('id')
        .eq('sangh_id', id)
        .eq('user_id', userId)
        .single();
      if (!mem) {
        return res.status(404).json({ error: 'Group not found' });
      }
    }

    const { count: memberCount } = await supabase
      .from('sangh_members')
      .select('*', { count: 'exact', head: true })
      .eq('sangh_id', id);

    const { data: myMember } = await supabase
      .from('sangh_members')
      .select('id')
      .eq('sangh_id', id)
      .eq('user_id', userId)
      .single();

    res.json({
      sangh: {
        ...sangh,
        isMember: !!myMember,
        memberCount: memberCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sangh/:id/join - Join a public group (or private if invited later).
 */
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data: sangh, error: fetchError } = await supabase
      .from('sanghs')
      .select('id, is_public')
      .eq('id', id)
      .single();

    if (fetchError || !sangh) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!sangh.is_public) {
      return res.status(403).json({ error: 'This group is private. You need an invite to join.' });
    }

    const { error: insertError } = await supabase
      .from('sangh_members')
      .insert([{ sangh_id: id, user_id: userId }]);

    if (insertError) {
      if (insertError.code === '23505') {
        return res.json({ message: 'Already a member', joined: true });
      }
      return res.status(400).json({ error: insertError.message });
    }

    res.json({ message: 'Joined', joined: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sangh/:id/leave - Leave a group. Creator cannot leave (must delete group or transfer).
 */
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data: sangh } = await supabase
      .from('sanghs')
      .select('id, created_by')
      .eq('id', id)
      .single();

    if (!sangh) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (sangh.created_by === userId) {
      return res.status(400).json({ error: 'Creator cannot leave. Delete the group or transfer ownership first.' });
    }

    const { error } = await supabase
      .from('sangh_members')
      .delete()
      .eq('sangh_id', id)
      .eq('user_id', userId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Left group', left: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sangh/:id/messages - List messages (members only). Paginated.
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(5, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const { data: sangh } = await supabase.from('sanghs').select('id, is_public').eq('id', id).single();
    if (!sangh) return res.status(404).json({ error: 'Group not found' });

    if (!sangh.is_public) {
      const { data: mem } = await supabase.from('sangh_members').select('id').eq('sangh_id', id).eq('user_id', userId).single();
      if (!mem) return res.status(403).json({ error: 'Not a member' });
    } else {
      const { data: mem } = await supabase.from('sangh_members').select('id').eq('sangh_id', id).eq('user_id', userId).single();
      if (!mem) return res.status(403).json({ error: 'Join the group to see messages' });
    }

    const { data: messages, error, count } = await supabase
      .from('sangh_messages')
      .select('*, sender:users(id, name)', { count: 'exact' })
      .eq('sangh_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) return res.status(400).json({ error: error.message });

    const total = count ?? 0;
    res.json({
      messages: messages || [],
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), hasMore: pageNum * limitNum < total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sangh/:id/messages - Send message. Admin (creator) only.
 */
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { content } = req.body;

    const { data: sangh } = await supabase.from('sanghs').select('id, created_by').eq('id', id).single();
    if (!sangh) return res.status(404).json({ error: 'Group not found' });
    if (sangh.created_by !== userId) return res.status(403).json({ error: 'Only the group admin can send messages' });

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const { data: msg, error } = await supabase
      .from('sangh_messages')
      .insert([{ sangh_id: id, user_id: userId, content: content.trim().slice(0, 5000) }])
      .select('*, sender:users(id, name)')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sangh/:id/members - Add a member. Admin (creator) only. Body: { user_id } or { email }.
 */
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { user_id: targetUserId, email } = req.body;

    const { data: sangh } = await supabase.from('sanghs').select('id, created_by').eq('id', id).single();
    if (!sangh) return res.status(404).json({ error: 'Group not found' });
    if (sangh.created_by !== userId) return res.status(403).json({ error: 'Only the group admin can add members' });

    let toAddId = targetUserId;
    if (!toAddId && email) {
      const { data: u } = await supabase.from('users').select('id').eq('email', String(email).trim().toLowerCase()).single();
      if (!u) return res.status(404).json({ error: 'User not found with that email' });
      toAddId = u.id;
    }
    if (!toAddId) return res.status(400).json({ error: 'Provide user_id or email' });

    const { error: insertError } = await supabase.from('sangh_members').insert([{ sangh_id: id, user_id: toAddId }]);
    if (insertError) {
      if (insertError.code === '23505') return res.json({ message: 'Already a member', added: true });
      return res.status(400).json({ error: insertError.message });
    }
    res.status(201).json({ message: 'Member added', added: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/sangh/:id - Delete group (creator only). Cascades to members.
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data: sangh } = await supabase
      .from('sanghs')
      .select('id, created_by')
      .eq('id', id)
      .single();

    if (!sangh || sangh.created_by !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this group' });
    }

    const { error } = await supabase.from('sanghs').delete().eq('id', id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
