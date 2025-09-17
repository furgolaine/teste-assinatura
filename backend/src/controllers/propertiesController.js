const { validationResult } = require('express-validator');
const pool = require('../config/database');

const getAllProperties = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      // Admin can see all properties
      query = `
        SELECT p.*, u.name as owner_name, u.email as owner_email 
        FROM properties p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC
      `;
      params = [];
    } else {
      // Proprietário can only see their own properties
      query = `
        SELECT p.*, u.name as owner_name, u.email as owner_email 
        FROM properties p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.user_id = $1 
        ORDER BY p.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json({ properties: result.rows });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params;

    if (userRole === 'admin') {
      query = `
        SELECT p.*, u.name as owner_name, u.email as owner_email 
        FROM properties p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.id = $1
      `;
      params = [id];
    } else {
      query = `
        SELECT p.*, u.name as owner_name, u.email as owner_email 
        FROM properties p 
        JOIN users u ON p.user_id = u.id 
        WHERE p.id = $1 AND p.user_id = $2
      `;
      params = [id, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Imóvel não encontrado' });
    }

    res.json({ property: result.rows[0] });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createProperty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, city, state, zip_code, user_id } = req.body;
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    // Determine the owner of the property
    let ownerId;
    if (userRole === 'admin' && user_id) {
      // Admin can create property for any user
      ownerId = user_id;
    } else {
      // Proprietário can only create property for themselves
      ownerId = currentUserId;
    }

    const result = await pool.query(
      'INSERT INTO properties (user_id, name, address, city, state, zip_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ownerId, name, address, city, state, zip_code]
    );

    res.status(201).json({
      message: 'Imóvel criado com sucesso',
      property: result.rows[0]
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const updateProperty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, address, city, state, zip_code } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if property exists and user has permission
    let checkQuery;
    let checkParams;

    if (userRole === 'admin') {
      checkQuery = 'SELECT * FROM properties WHERE id = $1';
      checkParams = [id];
    } else {
      checkQuery = 'SELECT * FROM properties WHERE id = $1 AND user_id = $2';
      checkParams = [id, userId];
    }

    const existingProperty = await pool.query(checkQuery, checkParams);

    if (existingProperty.rows.length === 0) {
      return res.status(404).json({ error: 'Imóvel não encontrado ou sem permissão' });
    }

    const result = await pool.query(
      'UPDATE properties SET name = $1, address = $2, city = $3, state = $4, zip_code = $5 WHERE id = $6 RETURNING *',
      [name, address, city, state, zip_code, id]
    );

    res.json({
      message: 'Imóvel atualizado com sucesso',
      property: result.rows[0]
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if property exists and user has permission
    let checkQuery;
    let checkParams;

    if (userRole === 'admin') {
      checkQuery = 'SELECT * FROM properties WHERE id = $1';
      checkParams = [id];
    } else {
      checkQuery = 'SELECT * FROM properties WHERE id = $1 AND user_id = $2';
      checkParams = [id, userId];
    }

    const existingProperty = await pool.query(checkQuery, checkParams);

    if (existingProperty.rows.length === 0) {
      return res.status(404).json({ error: 'Imóvel não encontrado ou sem permissão' });
    }

    // Check if property is used in any active subscription
    const subscriptionCheck = await pool.query(
      `SELECT s.id FROM subscriptions s 
       JOIN subscription_properties sp ON s.id = sp.subscription_id 
       WHERE sp.property_id = $1 AND s.status = 'ativo'`,
      [id]
    );

    if (subscriptionCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir imóvel com assinatura ativa' 
      });
    }

    await pool.query('DELETE FROM properties WHERE id = $1', [id]);

    res.json({ message: 'Imóvel excluído com sucesso' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty
};

