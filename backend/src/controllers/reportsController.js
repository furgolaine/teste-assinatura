const pool = require('../config/database');

const getMonthlySubscriptions = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    // Get active subscriptions for the specified month
    const subscriptionsResult = await pool.query(
      `SELECT s.*, u.name as user_name, u.email as user_email, p.name as plan_name, p.price_per_property,
              array_agg(
                json_build_object(
                  'id', prop.id,
                  'name', prop.name,
                  'address', prop.address,
                  'city', prop.city,
                  'state', prop.state,
                  'zip_code', prop.zip_code
                )
              ) as properties
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       LEFT JOIN subscription_properties sp ON s.id = sp.subscription_id
       LEFT JOIN properties prop ON sp.property_id = prop.id
       WHERE s.status = 'ativo'
       AND (
         (EXTRACT(MONTH FROM s.created_at) <= $1 AND EXTRACT(YEAR FROM s.created_at) <= $2)
         OR (EXTRACT(YEAR FROM s.created_at) < $2)
       )
       GROUP BY s.id, u.name, u.email, p.name, p.price_per_property
       ORDER BY s.created_at DESC`,
      [targetMonth, targetYear]
    );

    // Calculate total revenue
    const totalRevenue = subscriptionsResult.rows.reduce((sum, sub) => sum + parseFloat(sub.total_amount), 0);

    // Get subscription statistics by plan
    const planStatsResult = await pool.query(
      `SELECT p.name as plan_name, COUNT(s.id) as subscription_count, SUM(s.total_amount) as total_revenue
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.status = 'ativo'
       GROUP BY p.id, p.name
       ORDER BY subscription_count DESC`
    );

    res.json({
      month: targetMonth,
      year: targetYear,
      total_active_subscriptions: subscriptionsResult.rows.length,
      total_revenue: totalRevenue,
      plan_statistics: planStatsResult.rows,
      subscriptions: subscriptionsResult.rows
    });
  } catch (error) {
    console.error('Get monthly subscriptions error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getMonthlyShipments = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    const shipmentsResult = await pool.query(
      `SELECT sh.*, s.id as subscription_id, u.name as user_name, u.email as user_email,
              p.name as property_name, p.address as property_address, p.city, p.state, p.zip_code,
              pl.name as plan_name
       FROM shipments sh
       JOIN subscriptions s ON sh.subscription_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN properties p ON sh.property_id = p.id
       JOIN plans pl ON s.plan_id = pl.id
       WHERE EXTRACT(MONTH FROM sh.created_at) = $1 
       AND EXTRACT(YEAR FROM sh.created_at) = $2
       ORDER BY sh.created_at DESC`,
      [targetMonth, targetYear]
    );

    // Get shipment statistics by status
    const statusStatsResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM shipments
       WHERE EXTRACT(MONTH FROM created_at) = $1 
       AND EXTRACT(YEAR FROM created_at) = $2
       GROUP BY status
       ORDER BY count DESC`,
      [targetMonth, targetYear]
    );

    // Get shipment statistics by shipping service
    const serviceStatsResult = await pool.query(
      `SELECT shipping_service, COUNT(*) as count
       FROM shipments
       WHERE EXTRACT(MONTH FROM created_at) = $1 
       AND EXTRACT(YEAR FROM created_at) = $2
       GROUP BY shipping_service
       ORDER BY count DESC`,
      [targetMonth, targetYear]
    );

    res.json({
      month: targetMonth,
      year: targetYear,
      total_shipments: shipmentsResult.rows.length,
      status_statistics: statusStatsResult.rows,
      service_statistics: serviceStatsResult.rows,
      shipments: shipmentsResult.rows
    });
  } catch (error) {
    console.error('Get monthly shipments error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    // Get total active subscriptions
    const activeSubscriptionsResult = await pool.query(
      "SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ativo'"
    );

    // Get total properties
    const propertiesResult = await pool.query(
      "SELECT COUNT(*) as count FROM properties"
    );

    // Get pending shipments
    const pendingShipmentsResult = await pool.query(
      "SELECT COUNT(*) as count FROM shipments WHERE status = 'pendente'"
    );

    // Get this month's revenue
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const monthlyRevenueResult = await pool.query(
      `SELECT SUM(total_amount) as revenue
       FROM subscriptions 
       WHERE status = 'ativo'
       AND EXTRACT(MONTH FROM created_at) = $1 
       AND EXTRACT(YEAR FROM created_at) = $2`,
      [currentMonth, currentYear]
    );

    // Get recent activities (last 10 subscriptions and shipments)
    const recentSubscriptionsResult = await pool.query(
      `SELECT s.id, s.status, s.created_at, u.name as user_name, p.name as plan_name
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       ORDER BY s.created_at DESC
       LIMIT 5`
    );

    const recentShipmentsResult = await pool.query(
      `SELECT sh.id, sh.status, sh.created_at, u.name as user_name, prop.name as property_name
       FROM shipments sh
       JOIN subscriptions s ON sh.subscription_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN properties prop ON sh.property_id = prop.id
       ORDER BY sh.created_at DESC
       LIMIT 5`
    );

    res.json({
      statistics: {
        active_subscriptions: parseInt(activeSubscriptionsResult.rows[0].count),
        total_properties: parseInt(propertiesResult.rows[0].count),
        pending_shipments: parseInt(pendingShipmentsResult.rows[0].count),
        monthly_revenue: parseFloat(monthlyRevenueResult.rows[0].revenue || 0)
      },
      recent_activities: {
        subscriptions: recentSubscriptionsResult.rows,
        shipments: recentShipmentsResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's active subscriptions
    const subscriptionsResult = await pool.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as total_amount
       FROM subscriptions 
       WHERE user_id = $1 AND status = 'ativo'`,
      [userId]
    );

    // Get user's properties
    const propertiesResult = await pool.query(
      "SELECT COUNT(*) as count FROM properties WHERE user_id = $1",
      [userId]
    );

    // Get user's recent shipments
    const shipmentsResult = await pool.query(
      `SELECT sh.*, prop.name as property_name, pl.name as plan_name
       FROM shipments sh
       JOIN subscriptions s ON sh.subscription_id = s.id
       JOIN properties prop ON sh.property_id = prop.id
       JOIN plans pl ON s.plan_id = pl.id
       WHERE s.user_id = $1
       ORDER BY sh.created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      statistics: {
        active_subscriptions: parseInt(subscriptionsResult.rows[0].count),
        total_properties: parseInt(propertiesResult.rows[0].count),
        monthly_cost: parseFloat(subscriptionsResult.rows[0].total_amount || 0)
      },
      recent_shipments: shipmentsResult.rows
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getMonthlySubscriptions,
  getMonthlyShipments,
  getDashboardStats,
  getUserStats
};

