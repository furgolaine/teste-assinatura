const { validationResult } = require('express-validator');
const pool = require('../config/database');
const axios = require('axios');

// Melhor Envio API configuration
const melhorEnvioApi = axios.create({
  baseURL: process.env.MELHOR_ENVIO_SANDBOX === 'true' 
    ? 'https://sandbox.melhorenvio.com.br/api/v2/me' 
    : 'https://melhorenvio.com.br/api/v2/me',
  headers: {
    'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const getAllShipments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      // Admin can see all shipments
      query = `
        SELECT sh.*, s.id as subscription_id, u.name as user_name, u.email as user_email,
               p.name as property_name, p.address as property_address, p.city, p.state, p.zip_code,
               pl.name as plan_name
        FROM shipments sh
        JOIN subscriptions s ON sh.subscription_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN properties p ON sh.property_id = p.id
        JOIN plans pl ON s.plan_id = pl.id
        ORDER BY sh.created_at DESC
      `;
      params = [];
    } else {
      // Proprietário can only see shipments for their subscriptions
      query = `
        SELECT sh.*, s.id as subscription_id, u.name as user_name, u.email as user_email,
               p.name as property_name, p.address as property_address, p.city, p.state, p.zip_code,
               pl.name as plan_name
        FROM shipments sh
        JOIN subscriptions s ON sh.subscription_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN properties p ON sh.property_id = p.id
        JOIN plans pl ON s.plan_id = pl.id
        WHERE s.user_id = $1
        ORDER BY sh.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json({ shipments: result.rows });
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getShipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      query = `
        SELECT sh.*, s.id as subscription_id, u.name as user_name, u.email as user_email,
               p.name as property_name, p.address as property_address, p.city, p.state, p.zip_code,
               pl.name as plan_name, pl.items_included
        FROM shipments sh
        JOIN subscriptions s ON sh.subscription_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN properties p ON sh.property_id = p.id
        JOIN plans pl ON s.plan_id = pl.id
        WHERE sh.id = $1
      `;
      params = [id];
    } else {
      query = `
        SELECT sh.*, s.id as subscription_id, u.name as user_name, u.email as user_email,
               p.name as property_name, p.address as property_address, p.city, p.state, p.zip_code,
               pl.name as plan_name, pl.items_included
        FROM shipments sh
        JOIN subscriptions s ON sh.subscription_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN properties p ON sh.property_id = p.id
        JOIN plans pl ON s.plan_id = pl.id
        WHERE sh.id = $1 AND s.user_id = $2
      `;
      params = [id, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }

    res.json({ shipment: result.rows[0] });
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createShipment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subscription_id, property_id, shipping_service } = req.body;

    // Validate subscription exists
    const subscriptionResult = await pool.query(
      'SELECT s.*, p.name as plan_name FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.id = $1 AND s.status = $2',
      [subscription_id, 'ativo']
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura ativa não encontrada' });
    }

    // Validate property exists and belongs to subscription
    const propertyResult = await pool.query(
      `SELECT p.* FROM properties p 
       JOIN subscription_properties sp ON p.id = sp.property_id 
       WHERE p.id = $1 AND sp.subscription_id = $2`,
      [property_id, subscription_id]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Imóvel não encontrado na assinatura' });
    }

    const property = propertyResult.rows[0];
    const fullAddress = `${property.address}, ${property.city}, ${property.state}, ${property.zip_code}`;

    const result = await pool.query(
      'INSERT INTO shipments (subscription_id, property_id, address, status, shipping_service) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [subscription_id, property_id, fullAddress, 'pendente', shipping_service || 'Melhor Envio']
    );

    res.status(201).json({
      message: 'Envio criado com sucesso',
      shipment: result.rows[0]
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const updateShipmentStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Check if shipment exists
    const existingShipment = await pool.query(
      'SELECT * FROM shipments WHERE id = $1',
      [id]
    );

    if (existingShipment.rows.length === 0) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }

    let updateFields = ['status = $1'];
    let updateValues = [status, id];
    let paramIndex = 2;

    // Set timestamps based on status
    if (status === 'em_transporte' && !existingShipment.rows[0].shipped_at) {
      updateFields.push(`shipped_at = $${++paramIndex}`);
      updateValues.splice(-1, 0, new Date());
    } else if (status === 'entregue' && !existingShipment.rows[0].delivered_at) {
      updateFields.push(`delivered_at = $${++paramIndex}`);
      updateValues.splice(-1, 0, new Date());
    }

    const result = await pool.query(
      `UPDATE shipments SET ${updateFields.join(', ')} WHERE id = $${updateValues.length} RETURNING *`,
      updateValues
    );

    res.json({
      message: 'Status do envio atualizado com sucesso',
      shipment: result.rows[0]
    });
  } catch (error) {
    console.error('Update shipment status error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const generateLabel = async (req, res) => {
  try {
    const { shipment_id } = req.body;

    // Get shipment details
    const shipmentResult = await pool.query(
      `SELECT sh.*, p.name as property_name, p.address, p.city, p.state, p.zip_code,
              u.name as user_name, u.email as user_email
       FROM shipments sh
       JOIN properties p ON sh.property_id = p.id
       JOIN subscriptions s ON sh.subscription_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE sh.id = $1`,
      [shipment_id]
    );

    if (shipmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envio não encontrado' });
    }

    const shipment = shipmentResult.rows[0];

    try {
      // Create shipping order in Melhor Envio
      const shippingOrder = await melhorEnvioApi.post('/cart', {
        service: 1, // Correios PAC
        agency: 49, // Agency ID (you need to get this from Melhor Envio)
        from: {
          name: 'Sua Empresa',
          phone: '11999999999',
          email: 'contato@suaempresa.com',
          document: '12345678901',
          company_document: '12345678901234',
          state_register: '123456789',
          postal_code: '01310-100',
          address: 'Av. Paulista, 1000',
          location_number: '1000',
          complement: 'Sala 1',
          district: 'Bela Vista',
          city: 'São Paulo',
          state_abbr: 'SP',
          country_id: 'BR'
        },
        to: {
          name: shipment.user_name,
          phone: '11999999999', // You might want to add phone to user table
          email: shipment.user_email,
          document: '12345678901', // You might want to add document to user table
          postal_code: shipment.zip_code.replace(/\D/g, ''),
          address: shipment.address,
          location_number: 'S/N',
          district: 'Centro',
          city: shipment.city,
          state_abbr: shipment.state,
          country_id: 'BR'
        },
        products: [
          {
            name: 'Kit de Limpeza',
            quantity: 1,
            unitary_value: 30.00
          }
        ],
        volumes: [
          {
            height: 10,
            width: 20,
            length: 30,
            weight: 1.0
          }
        ],
        options: {
          insurance_value: 30.00,
          receipt: false,
          own_hand: false,
          reverse: false,
          non_commercial: false
        }
      });

      // Purchase the shipping label
      const purchase = await melhorEnvioApi.post('/shipment/checkout', {
        orders: [shippingOrder.data.id]
      });

      // Generate the label
      const label = await melhorEnvioApi.post('/shipment/generate', {
        orders: [shippingOrder.data.id]
      });

      // Update shipment with tracking code
      await pool.query(
        'UPDATE shipments SET tracking_code = $1, status = $2 WHERE id = $3',
        [shippingOrder.data.tracking, 'em_transporte', shipment_id]
      );

      res.json({
        message: 'Etiqueta gerada com sucesso',
        label_url: label.data.url,
        tracking_code: shippingOrder.data.tracking
      });
    } catch (melhorEnvioError) {
      console.error('Melhor Envio error:', melhorEnvioError.response?.data || melhorEnvioError.message);
      return res.status(400).json({
        error: 'Erro ao gerar etiqueta',
        details: melhorEnvioError.response?.data || melhorEnvioError.message
      });
    }
  } catch (error) {
    console.error('Generate label error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const handleTrackingWebhook = async (req, res) => {
  try {
    const { tracking, status } = req.body;

    // Map Melhor Envio status to our internal status
    let internalStatus;
    switch (status) {
      case 'posted':
        internalStatus = 'em_transporte';
        break;
      case 'delivered':
        internalStatus = 'entregue';
        break;
      case 'canceled':
        internalStatus = 'cancelado';
        break;
      default:
        internalStatus = 'em_transporte';
    }

    // Update shipment status
    const result = await pool.query(
      'UPDATE shipments SET status = $1 WHERE tracking_code = $2 RETURNING *',
      [internalStatus, tracking]
    );

    if (result.rows.length > 0) {
      console.log(`Shipment with tracking ${tracking} updated to status ${internalStatus}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Tracking webhook error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook de rastreamento' });
  }
};

const getMonthlyShipments = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    const result = await pool.query(
      `SELECT sh.*, s.id as subscription_id, u.name as user_name,
              p.name as property_name, p.address as property_address,
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

    res.json({
      month: targetMonth,
      year: targetYear,
      total_shipments: result.rows.length,
      shipments: result.rows
    });
  } catch (error) {
    console.error('Get monthly shipments error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getAllShipments,
  getShipmentById,
  createShipment,
  updateShipmentStatus,
  generateLabel,
  handleTrackingWebhook,
  getMonthlyShipments
};

