const { body, param, query } = require('express-validator');

const authValidation = {
  login: [
    body('email')
      .isEmail()
      .withMessage('Email deve ser válido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres')
  ],

  register: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome deve ter entre 2 e 255 caracteres'),
    body('email')
      .isEmail()
      .withMessage('Email deve ser válido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter pelo menos 6 caracteres')
  ]
};

const propertyValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome do imóvel deve ter entre 2 e 255 caracteres'),
    body('address')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Endereço deve ter entre 5 e 500 caracteres'),
    body('city')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Cidade deve ter entre 2 e 255 caracteres'),
    body('state')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Estado deve ter exatamente 2 caracteres'),
    body('zip_code')
      .trim()
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage('CEP deve estar no formato 12345-678 ou 12345678'),
    body('user_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ID do usuário deve ser um número inteiro positivo')
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID deve ser um número inteiro positivo'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome do imóvel deve ter entre 2 e 255 caracteres'),
    body('address')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Endereço deve ter entre 5 e 500 caracteres'),
    body('city')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Cidade deve ter entre 2 e 255 caracteres'),
    body('state')
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage('Estado deve ter exatamente 2 caracteres'),
    body('zip_code')
      .trim()
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage('CEP deve estar no formato 12345-678 ou 12345678')
  ],

  delete: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID deve ser um número inteiro positivo')
  ]
};

const planValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome do plano deve ter entre 2 e 255 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Descrição deve ter no máximo 1000 caracteres'),
    body('price_per_property')
      .isFloat({ min: 0.01 })
      .withMessage('Preço por imóvel deve ser um valor positivo'),
    body('items_included')
      .isArray({ min: 1 })
      .withMessage('Lista de itens inclusos deve ser um array com pelo menos 1 item')
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID deve ser um número inteiro positivo'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Nome do plano deve ter entre 2 e 255 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Descrição deve ter no máximo 1000 caracteres'),
    body('price_per_property')
      .isFloat({ min: 0.01 })
      .withMessage('Preço por imóvel deve ser um valor positivo'),
    body('items_included')
      .isArray({ min: 1 })
      .withMessage('Lista de itens inclusos deve ser um array com pelo menos 1 item')
  ],

  delete: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID deve ser um número inteiro positivo')
  ]
};

const subscriptionValidation = {
  create: [
    body('plan_id')
      .isInt({ min: 1 })
      .withMessage('ID do plano deve ser um número inteiro positivo'),
    body('property_ids')
      .isArray({ min: 1 })
      .withMessage('Lista de IDs de imóveis deve ser um array com pelo menos 1 item'),
    body('property_ids.*')
      .isInt({ min: 1 })
      .withMessage('Cada ID de imóvel deve ser um número inteiro positivo'),
    body('payment_method_token')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Token do método de pagamento é obrigatório')
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID deve ser um número inteiro positivo'),
    body('plan_id')
      .isInt({ min: 1 })
      .withMessage('ID do plano deve ser um número inteiro positivo'),
    body('property_ids')
      .isArray({ min: 1 })
      .withMessage('Lista de IDs de imóveis deve ser um array com pelo menos 1 item'),
    body('property_ids.*')
      .isInt({ min: 1 })
      .withMessage('Cada ID de imóvel deve ser um número inteiro positivo')
  ]
};

const shipmentValidation = {
  create: [
    body('subscription_id')
      .isInt({ min: 1 })
      .withMessage('ID da assinatura deve ser um número inteiro positivo'),
    body('property_id')
      .isInt({ min: 1 })
      .withMessage('ID do imóvel deve ser um número inteiro positivo'),
    body('shipping_service')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Serviço de envio deve ter entre 1 e 100 caracteres')
  ],

  updateStatus: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID deve ser um número inteiro positivo'),
    body('status')
      .isIn(['pendente', 'em_transporte', 'entregue', 'cancelado'])
      .withMessage('Status deve ser: pendente, em_transporte, entregue ou cancelado')
  ],

  generateLabel: [
    body('shipment_id')
      .isInt({ min: 1 })
      .withMessage('ID do envio deve ser um número inteiro positivo')
  ]
};

const reportValidation = {
  monthlyQuery: [
    query('month')
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Mês deve ser um número entre 1 e 12'),
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Ano deve ser um número entre 2020 e 2030')
  ]
};

const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um número inteiro positivo')
];

module.exports = {
  authValidation,
  propertyValidation,
  planValidation,
  subscriptionValidation,
  shipmentValidation,
  reportValidation,
  idValidation
};

