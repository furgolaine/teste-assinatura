# Backend - Sistema de Assinatura para Imóveis

Backend Node.js com Express e PostgreSQL para o sistema de assinatura de produtos para proprietários de imóveis.

## Funcionalidades

- **Autenticação JWT** para proprietários e administradores
- **Gerenciamento de Imóveis** (CRUD completo)
- **Gerenciamento de Planos** de assinatura (Básico e Premium)
- **Sistema de Assinaturas** com integração Pagar.me
- **Gerenciamento de Envios** com integração Melhor Envio/Correios
- **Relatórios Administrativos** mensais
- **Webhooks** para pagamentos e rastreamento

## Tecnologias

- **Node.js** com Express.js
- **PostgreSQL** como banco de dados
- **JWT** para autenticação
- **bcryptjs** para hash de senhas
- **express-validator** para validação de dados
- **helmet** e **cors** para segurança
- **morgan** para logging
- **rate-limiting** para proteção contra DDoS

## Pré-requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## Instalação

1. Clone o repositório e navegue para o diretório do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```
Edite o arquivo `.env` com suas configurações.

4. Configure o banco de dados PostgreSQL e execute as migrações:
```bash
npm run setup-db
```

## Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento (com nodemon)
- `npm run setup-db` - Executa migrações e seeds do banco de dados

## Estrutura do Projeto

```
src/
├── config/          # Configurações (banco de dados, etc.)
├── controllers/     # Controladores das rotas
├── middleware/      # Middlewares (auth, validação, etc.)
├── models/          # Modelos de dados (se necessário)
├── routes/          # Definição das rotas
└── utils/           # Utilitários diversos

database/
├── migrations/      # Scripts de migração do banco
└── seeds/          # Scripts de seed (dados iniciais)

scripts/            # Scripts utilitários
```

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de proprietário
- `GET /api/auth/profile` - Perfil do usuário autenticado

### Imóveis
- `GET /api/properties` - Listar imóveis
- `GET /api/properties/:id` - Obter imóvel específico
- `POST /api/properties` - Criar imóvel
- `PUT /api/properties/:id` - Atualizar imóvel
- `DELETE /api/properties/:id` - Excluir imóvel

### Planos
- `GET /api/plans` - Listar planos disponíveis
- `GET /api/plans/:id` - Obter plano específico
- `POST /api/plans` - Criar plano (admin)
- `PUT /api/plans/:id` - Atualizar plano (admin)
- `DELETE /api/plans/:id` - Excluir plano (admin)

### Assinaturas
- `GET /api/subscriptions` - Listar assinaturas
- `GET /api/subscriptions/:id` - Obter assinatura específica
- `POST /api/subscriptions` - Criar assinatura
- `PUT /api/subscriptions/:id` - Atualizar assinatura
- `POST /api/subscriptions/webhook` - Webhook Pagar.me

### Envios
- `GET /api/shipments` - Listar envios
- `GET /api/shipments/:id` - Obter envio específico
- `POST /api/shipments` - Criar envio (admin)
- `PUT /api/shipments/:id/status` - Atualizar status (admin)
- `POST /api/shipments/generate-label` - Gerar etiqueta (admin)
- `POST /api/shipments/tracking-webhook` - Webhook rastreamento

### Relatórios
- `GET /api/reports/monthly-subscriptions` - Relatório mensal de assinaturas (admin)
- `GET /api/reports/monthly-shipments` - Relatório mensal de envios (admin)
- `GET /api/reports/dashboard` - Estatísticas do dashboard (admin)
- `GET /api/reports/user-stats` - Estatísticas do usuário

## Configuração de Integrações

### Pagar.me
Configure as variáveis no `.env`:
```
PAGARME_API_KEY=your_api_key_here
PAGARME_ENCRYPTION_KEY=your_encryption_key_here
```

### Melhor Envio
Configure as variáveis no `.env`:
```
MELHOR_ENVIO_TOKEN=your_token_here
MELHOR_ENVIO_SANDBOX=true
```

### Correios
Configure as variáveis no `.env`:
```
CORREIOS_USER=your_user_here
CORREIOS_PASSWORD=your_password_here
CORREIOS_CARD_NUMBER=your_card_number_here
```

## Segurança

- Rate limiting implementado
- Helmet para headers de segurança
- CORS configurado
- Validação de entrada em todas as rotas
- Autenticação JWT obrigatória
- Controle de acesso baseado em roles

## Desenvolvimento

Para desenvolvimento local:

1. Inicie o PostgreSQL
2. Configure o `.env` para desenvolvimento
3. Execute `npm run setup-db` para configurar o banco
4. Execute `npm run dev` para iniciar em modo desenvolvimento

## Produção

Para deploy em produção:

1. Configure as variáveis de ambiente de produção
2. Execute `npm run setup-db` no servidor
3. Execute `npm start` para iniciar o servidor
4. Configure um proxy reverso (nginx) se necessário

## Health Check

O servidor expõe um endpoint de health check em `/health` para monitoramento.

