const { validationResult } = require('express-validator');
const pool = require('../config/database');

const getAllPlans = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM plans ORDER BY price_per_property ASC'
    );

    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM plans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    res.json({ plan: result.rows[0] });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createPlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price_per_property, items_included } = req.body;

    // Check if plan name already exists
    const existingPlan = await pool.query(
      'SELECT id FROM plans WHERE name = $1',
      [name]
    );

    if (existingPlan.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um plano com este nome' });
    }

    const result = await pool.query(
      'INSERT INTO plans (name, description, price_per_property, items_included) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price_per_property, JSON.stringify(items_included)]
    );

    res.status(201).json({
      message: 'Plano criado com sucesso',
      plan: result.rows[0]
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const updatePlan = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, price_per_property, items_included } = req.body;

    // Check if plan exists
    const existingPlan = await pool.query(
      'SELECT * FROM plans WHERE id = $1',
      [id]
    );

    if (existingPlan.rows.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Check if name is being changed and if it conflicts with another plan
    if (name !== existingPlan.rows[0].name) {
      const nameConflict = await pool.query(
        'SELECT id FROM plans WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe um plano com este nome' });
      }
    }

    const result = await pool.query(
      'UPDATE plans SET name = $1, description = $2, price_per_property = $3, items_included = $4 WHERE id = $5 RETURNING *',
      [name, description, price_per_property, JSON.stringify(items_included), id]
    );

    res.json({
      message: 'Plano atualizado com sucesso',
      plan: result.rows[0]
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plan exists
    const existingPlan = await pool.query(
      'SELECT * FROM plans WHERE id = $1',
      [id]
    );

    if (existingPlan.rows.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Check if plan is used in any active subscription
    const subscriptionCheck = await pool.query(
      'SELECT id FROM subscriptions WHERE plan_id = $1 AND status = $2',
      [id, 'ativo']
    );

    if (subscriptionCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir plano com assinaturas ativas' 
      });
    }

    await pool.query('DELETE FROM plans WHERE id = $1', [id]);

    res.json({ message: 'Plano excluído com sucesso' });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
};

