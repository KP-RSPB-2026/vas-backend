const { supabase } = require('../config/supabase');

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const role = req.query.role;
    const search = req.query.search;
    const limit = Number(req.query.limit ?? 20);
    const page = req.query.page ? Number(req.query.page) : 1;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('id, email, name, role, created_at', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Fetch users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }

    const total = typeof count === 'number' ? count : users?.length ?? 0;
    const hasMore = offset + (users?.length ?? 0) < total;

    return res.status(200).json({
      success: true,
      data: users ?? [],
      meta: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  getAllUsers,
};
