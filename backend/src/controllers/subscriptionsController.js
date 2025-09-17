const { validationResult } = require('express-validator');
const pool = require('../config/database');
const axios = require('axios');

// Pagar.me API configuration
const pagarmeApi = axios.create({
  baseURL: 'https://api.pagar.me/core/v5',
  headers: {
    'Authorization': `Bearer ${process.env.PAGARME_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

const getAllSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      // Admin can see all subscriptions
      query = `
        SELECT s.*, u.name as user_name, u.email as user_email, p.name as plan_name, p.price_per_property,
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
        GROUP BY s.id, u.name, u.email, p.name, p.price_per_property
        ORDER BY s.created_at DESC
      `;
      params = [];
    } else {
      // Proprietário can only see their own subscriptions
      query = `
        SELECT s.*, u.name as user_name, u.email as user_email, p.name as plan_name, p.price_per_property,
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
        WHERE s.user_id = $1
        GROUP BY s.id, u.name, u.email, p.name, p.price_per_property
        ORDER BY s.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      query = `
        SELECT s.*, u.name as user_name, u.email as user_email, p.name as plan_name, p.price_per_property, p.items_included,
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
        WHERE s.id = $1
        GROUP BY s.id, u.name, u.email, p.name, p.price_per_property, p.items_included
      `;
      params = [id];
    } else {
      query = `
        SELECT s.*, u.name as user_name, u.email as user_email, p.name as plan_name, p.price_per_property, p.items_included,
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
        WHERE s.id = $1 AND s.user_id = $2
        GROUP BY s.id, u.name, u.email, p.name, p.price_per_property, p.items_included
      `;
      params = [id, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createSubscription = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { plan_id, property_ids, payment_method_token } = req.body;
    const userId = req.user.id;

    await client.query('BEGIN');

    // Validate plan exists
    const planResult = await client.query(
      'SELECT * FROM plans WHERE id = $1',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    const plan = planResult.rows[0];

    // Validate all properties exist and belong to user
    const propertiesResult = await client.query(
      'SELECT * FROM properties WHERE id = ANY($1) AND user_id = $2',
      [property_ids, userId]
    );

    if (propertiesResult.rows.length !== property_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Um ou mais imóveis não foram encontrados ou não pertencem ao usuário' });
    }

    // Calculate total amount
    const totalAmount = plan.price_per_property * property_ids.length;

    // Get user data for Pagar.me
    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Create subscription in Pagar.me
    let pagarmeSubscriptionId = null;
    try {
      const pagarmeSubscription = await pagarmeApi.post('/subscriptions', {
        plan_id: `plan_${plan_id}`, // You need to create plans in Pagar.me first
        customer: {
          name: user.name,
          email: user.email
        },
        payment_method: payment_method_token,
        metadata: {
          user_id: userId,
          property_count: property_ids.length
        }
      });
      
      pagarmeSubscriptionId = pagarmeSubscription.data.id;
    } catch (pagarmeError) {
      console.error('Pagar.me error:', pagarmeError.response?.data || pagarmeError.message);
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Erro ao processar pagamento',
        details: pagarmeError.response?.data?.errors || pagarmeError.message
      });
    }

    // Create subscription in database
    const subscriptionResult = await client.query(
      'INSERT INTO subscriptions (user_id, plan_id, status, total_amount, pagarme_subscription_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, plan_id, 'pendente', totalAmount, pagarmeSubscriptionId]
    );

    const subscription = subscriptionResult.rows[0];

    // Link properties to subscription
    for (const propertyId of property_ids) {
      await client.query(
        'INSERT INTO subscription_properties (subscription_id, property_id) VALUES ($1, $2)',
        [subscription.id, propertyId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Assinatura criada com sucesso',
      subscription: {
        ...subscription,
        properties: propertiesResult.rows
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

const updateSubscription = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { plan_id, property_ids } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    await client.query('BEGIN');

    // Check if subscription exists and user has permission
    let subscriptionQuery;
    let subscriptionParams;

    if (userRole === 'admin') {
      subscriptionQuery = 'SELECT * FROM subscriptions WHERE id = $1';
      subscriptionParams = [id];
    } else {
      subscriptionQuery = 'SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2';
      subscriptionParams = [id, userId];
    }

    const subscriptionResult = await client.query(subscriptionQuery, subscriptionParams);

    if (subscriptionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Assinatura não encontrada ou sem permissão' });
    }

    const subscription = subscriptionResult.rows[0];

    // Validate plan exists
    const planResult = await client.query(
      'SELECT * FROM plans WHERE id = $1',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    const plan = planResult.rows[0];

    // Validate all properties exist and belong to subscription owner
    const propertiesResult = await client.query(
      'SELECT * FROM properties WHERE id = ANY($1) AND user_id = $2',
      [property_ids, subscription.user_id]
    );

    if (propertiesResult.rows.length !== property_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Um ou mais imóveis não foram encontrados ou não pertencem ao usuário' });
    }

    // Calculate new total amount
    const totalAmount = plan.price_per_property * property_ids.length;

    // Update subscription
    const updatedSubscriptionResult = await client.query(
      'UPDATE subscriptions SET plan_id = $1, total_amount = $2 WHERE id = $3 RETURNING *',
      [plan_id, totalAmount, id]
    );

    // Remove old property associations
    await client.query(
      'DELETE FROM subscription_properties WHERE subscription_id = $1',
      [id]
    );

    // Add new property associations
    for (const propertyId of property_ids) {
      await client.query(
        'INSERT INTO subscription_properties (subscription_id, property_id) VALUES ($1, $2)',
        [id, propertyId]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Assinatura atualizada com sucesso',
      subscription: {
        ...updatedSubscriptionResult.rows[0],
        properties: propertiesResult.rows
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

const handleWebhook = async (req, res) => {
  try {
    const { id, status, object } = req.body;

    if (object === 'subscription') {
      // Update subscription status based on Pagar.me webhook
      let dbStatus;
      switch (status) {
        case 'active':
          dbStatus = 'ativo';
          break;
        case 'canceled':
          dbStatus = 'cancelado';
          break;
        case 'past_due':
          dbStatus = 'pendente';
          break;
        default:
          dbStatus = 'pendente';
      }

      await pool.query(
        'UPDATE subscriptions SET status = $1 WHERE pagarme_subscription_id = $2',
        [dbStatus, id]
      );

      console.log(`Subscription ${id} status updated to ${dbStatus}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

module.exports = {
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  handleWebhook
};

