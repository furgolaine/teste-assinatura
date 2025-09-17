const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/database');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUserResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, 'proprietario']
    );

    const newUser = newUserResult.rows[0];

    // Generate JWT token
    const token = generateToken(newUser.id);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  login,
  register,
  getProfile
};

