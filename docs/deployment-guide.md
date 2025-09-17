# Guia de Implantação e Configuração
## Sistema de Assinatura para Imóveis

**Versão:** 1.0.0  
**Data:** Setembro 2025  
**Autor:** Manus AI

## Sumário

Este guia fornece instruções detalhadas para implantação e configuração do Sistema de Assinatura para Imóveis em diferentes ambientes, desde desenvolvimento local até produção em larga escala.

## 1. Pré-requisitos do Sistema

### 1.1 Requisitos de Software

**Obrigatórios:**
- Node.js 18.0 ou superior
- PostgreSQL 12.0 ou superior
- npm 8.0 ou superior (ou pnpm 7.0+)
- Git 2.30 ou superior

**Recomendados para Produção:**
- Docker 20.10 ou superior
- Docker Compose 2.0 ou superior
- Nginx 1.20 ou superior
- Redis 6.0 ou superior (para cache)
- PM2 5.0 ou superior (para gerenciamento de processos)

### 1.2 Requisitos de Hardware

**Ambiente de Desenvolvimento:**
- CPU: 2 cores
- RAM: 4GB
- Armazenamento: 10GB livres
- Conexão de internet estável

**Ambiente de Produção (Pequeno/Médio):**
- CPU: 4 cores
- RAM: 8GB
- Armazenamento: 50GB SSD
- Largura de banda: 100Mbps

**Ambiente de Produção (Grande Escala):**
- CPU: 8+ cores
- RAM: 16GB+
- Armazenamento: 200GB+ SSD
- Largura de banda: 1Gbps
- Load balancer configurado

## 2. Configuração do Ambiente de Desenvolvimento

### 2.1 Clonagem e Configuração Inicial

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/subscription-system.git
cd subscription-system

# Verificar estrutura do projeto
ls -la
# Deve mostrar: backend/, admin-panel/, mobile-app/, docs/, README.md
```

### 2.2 Configuração do Banco de Dados

**Instalação do PostgreSQL (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Criação do Banco de Dados:**
```bash
# Acessar como usuário postgres
sudo -u postgres psql

# Criar banco de dados e usuário
CREATE DATABASE subscription_system;
CREATE USER subscription_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE subscription_system TO subscription_user;
\q
```

**Configuração de Conexão:**
```bash
# Editar pg_hba.conf para permitir conexões locais
sudo nano /etc/postgresql/13/main/pg_hba.conf

# Adicionar linha (ajustar versão conforme necessário):
local   subscription_system    subscription_user                     md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### 2.3 Configuração do Backend

```bash
cd backend

# Instalar dependências
npm install

# Criar arquivo de configuração
cp .env.example .env

# Editar configurações
nano .env
```

**Exemplo de arquivo .env para desenvolvimento:**
```bash
# Database
DATABASE_URL=postgresql://subscription_user:sua_senha_segura@localhost:5432/subscription_system

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5174,http://localhost:5175

# Pagar.me (opcional para desenvolvimento)
PAGARME_API_KEY=ak_test_seu_api_key_aqui
PAGARME_ENCRYPTION_KEY=ek_test_seu_encryption_key_aqui

# Melhor Envio (opcional para desenvolvimento)
MELHOR_ENVIO_TOKEN=seu_token_melhor_envio_aqui
MELHOR_ENVIO_SANDBOX=true

# Logging
LOG_LEVEL=debug
```

**Executar migrações e seeds:**
```bash
# Executar script de configuração do banco
node scripts/setup-database.js

# Verificar se as tabelas foram criadas
psql -U subscription_user -d subscription_system -c "\dt"
```

**Iniciar servidor de desenvolvimento:**
```bash
npm run dev
# Servidor deve iniciar em http://localhost:3000
```

### 2.4 Configuração do Painel Administrativo

```bash
cd ../admin-panel

# Instalar dependências
pnpm install

# Criar arquivo de configuração
cp .env.example .env

# Editar configurações
nano .env
```

**Exemplo de arquivo .env:**
```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Painel Administrativo
VITE_APP_VERSION=1.0.0
```

**Iniciar servidor de desenvolvimento:**
```bash
pnpm run dev
# Aplicação deve iniciar em http://localhost:5174
```

### 2.5 Configuração do Aplicativo Mobile

```bash
cd ../mobile-app

# Instalar dependências
pnpm install

# Criar arquivo de configuração
cp .env.example .env

# Editar configurações
nano .env
```

**Exemplo de arquivo .env:**
```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=App Proprietário
VITE_APP_VERSION=1.0.0
```

**Iniciar servidor de desenvolvimento:**
```bash
pnpm run dev
# Aplicação deve iniciar em http://localhost:5175
```

## 3. Configuração de Produção

### 3.1 Preparação do Servidor

**Atualização do Sistema (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget gnupg2 software-properties-common apt-transport-https ca-certificates
```

**Instalação do Node.js:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs
node --version  # Verificar versão
npm --version   # Verificar versão
```

**Instalação do PostgreSQL:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Instalação do Nginx:**
```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Instalação do PM2:**
```bash
sudo npm install -g pm2
```

### 3.2 Configuração do Banco de Dados em Produção

**Criação do Banco e Usuário:**
```bash
sudo -u postgres psql
CREATE DATABASE subscription_system_prod;
CREATE USER subscription_prod WITH PASSWORD 'senha_super_segura_producao';
GRANT ALL PRIVILEGES ON DATABASE subscription_system_prod TO subscription_prod;
\q
```

**Configuração de Segurança:**
```bash
# Editar postgresql.conf
sudo nano /etc/postgresql/13/main/postgresql.conf

# Configurações recomendadas:
listen_addresses = 'localhost'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Editar pg_hba.conf
sudo nano /etc/postgresql/13/main/pg_hba.conf

# Configurar autenticação:
local   subscription_system_prod    subscription_prod                     md5
host    subscription_system_prod    subscription_prod    127.0.0.1/32     md5

sudo systemctl restart postgresql
```

### 3.3 Deploy do Backend

**Preparação dos Arquivos:**
```bash
# Criar diretório da aplicação
sudo mkdir -p /var/www/subscription-system
sudo chown $USER:$USER /var/www/subscription-system

# Copiar arquivos do backend
cp -r backend/* /var/www/subscription-system/backend/
cd /var/www/subscription-system/backend

# Instalar dependências de produção
npm ci --only=production
```

**Configuração de Produção:**
```bash
# Criar arquivo .env de produção
nano .env
```

**Exemplo de .env para produção:**
```bash
# Database
DATABASE_URL=postgresql://subscription_prod:senha_super_segura_producao@localhost:5432/subscription_system_prod

# JWT
JWT_SECRET=jwt-secret-super-seguro-producao-256-bits
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://admin.seudominio.com,https://app.seudominio.com

# Pagar.me (produção)
PAGARME_API_KEY=ak_live_seu_api_key_producao
PAGARME_ENCRYPTION_KEY=ek_live_seu_encryption_key_producao

# Melhor Envio (produção)
MELHOR_ENVIO_TOKEN=seu_token_producao_melhor_envio
MELHOR_ENVIO_SANDBOX=false

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/subscription-system/app.log

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Configuração do PM2:**
```bash
# Criar arquivo ecosystem.config.js
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'subscription-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/subscription-system/err.log',
    out_file: '/var/log/subscription-system/out.log',
    log_file: '/var/log/subscription-system/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

**Iniciar aplicação:**
```bash
# Criar diretório de logs
sudo mkdir -p /var/log/subscription-system
sudo chown $USER:$USER /var/log/subscription-system

# Executar migrações
node scripts/setup-database.js

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.4 Deploy dos Frontends

**Build do Painel Administrativo:**
```bash
cd /var/www/subscription-system/admin-panel

# Instalar dependências
pnpm install

# Configurar variáveis de produção
nano .env
```

```bash
VITE_API_BASE_URL=https://api.seudominio.com/api
VITE_APP_NAME=Painel Administrativo
VITE_APP_VERSION=1.0.0
```

```bash
# Build para produção
pnpm run build

# Copiar arquivos para Nginx
sudo cp -r dist/* /var/www/html/admin/
```

**Build do Aplicativo Mobile:**
```bash
cd /var/www/subscription-system/mobile-app

# Instalar dependências
pnpm install

# Configurar variáveis de produção
nano .env
```

```bash
VITE_API_BASE_URL=https://api.seudominio.com/api
VITE_APP_NAME=App Proprietário
VITE_APP_VERSION=1.0.0
```

```bash
# Build para produção
pnpm run build

# Copiar arquivos para Nginx
sudo cp -r dist/* /var/www/html/app/
```

### 3.5 Configuração do Nginx

**Configuração Principal:**
```bash
sudo nano /etc/nginx/sites-available/subscription-system
```

```nginx
# Backend API
server {
    listen 443 ssl http2;
    server_name api.seudominio.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Admin Panel
server {
    listen 443 ssl http2;
    server_name admin.seudominio.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    root /var/www/html/admin;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Mobile App
server {
    listen 443 ssl http2;
    server_name app.seudominio.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    root /var/www/html/app;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.seudominio.com admin.seudominio.com app.seudominio.com;
    return 301 https://$server_name$request_uri;
}
```

**Ativar configuração:**
```bash
sudo ln -s /etc/nginx/sites-available/subscription-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Configuração de SSL/TLS

### 4.1 Certificado SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificados
sudo certbot --nginx -d api.seudominio.com -d admin.seudominio.com -d app.seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 5. Monitoramento e Logs

### 5.1 Configuração de Logs

**Logrotate para aplicação:**
```bash
sudo nano /etc/logrotate.d/subscription-system
```

```
/var/log/subscription-system/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload subscription-backend
    endscript
}
```

### 5.2 Monitoramento com PM2

```bash
# Monitorar aplicação
pm2 monit

# Ver logs em tempo real
pm2 logs subscription-backend

# Status da aplicação
pm2 status

# Restart se necessário
pm2 restart subscription-backend
```

## 6. Backup e Recuperação

### 6.1 Backup do Banco de Dados

**Script de backup automático:**
```bash
sudo nano /usr/local/bin/backup-subscription-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/subscription-system"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="subscription_system_prod"
DB_USER="subscription_prod"

mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Manter apenas últimos 30 dias
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup concluído: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-subscription-db.sh

# Agendar backup diário
sudo crontab -e
# Adicionar linha:
0 2 * * * /usr/local/bin/backup-subscription-db.sh
```

### 6.2 Procedimento de Recuperação

```bash
# Restaurar backup
gunzip -c /var/backups/subscription-system/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U subscription_prod -d subscription_system_prod
```

## 7. Solução de Problemas

### 7.1 Problemas Comuns

**Backend não inicia:**
```bash
# Verificar logs
pm2 logs subscription-backend

# Verificar configuração
node -c server.js

# Verificar conexão com banco
psql -U subscription_prod -d subscription_system_prod -c "SELECT 1;"
```

**Frontend não carrega:**
```bash
# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar arquivos estáticos
ls -la /var/www/html/admin/
ls -la /var/www/html/app/
```

**Problemas de performance:**
```bash
# Monitorar recursos
htop
iotop
pm2 monit

# Verificar logs de erro
tail -f /var/log/subscription-system/err.log
```

### 7.2 Comandos Úteis

```bash
# Status geral do sistema
systemctl status postgresql nginx
pm2 status

# Reiniciar serviços
sudo systemctl restart postgresql
sudo systemctl restart nginx
pm2 restart subscription-backend

# Verificar portas em uso
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Verificar espaço em disco
df -h
du -sh /var/www/subscription-system/
du -sh /var/log/subscription-system/
```

## 8. Checklist de Deploy

### 8.1 Pré-Deploy
- [ ] Código testado em ambiente de desenvolvimento
- [ ] Variáveis de ambiente configuradas
- [ ] Certificados SSL válidos
- [ ] Backup do banco de dados atual
- [ ] Dependências atualizadas

### 8.2 Deploy
- [ ] Aplicação parada graciosamente
- [ ] Código atualizado
- [ ] Migrações de banco executadas
- [ ] Build dos frontends realizado
- [ ] Aplicação reiniciada
- [ ] Testes de smoke executados

### 8.3 Pós-Deploy
- [ ] Aplicação respondendo corretamente
- [ ] Logs sem erros críticos
- [ ] Métricas de performance normais
- [ ] Funcionalidades críticas testadas
- [ ] Monitoramento ativo

---

Este guia de implantação fornece uma base sólida para deploy do Sistema de Assinatura para Imóveis. Para ambientes específicos ou requisitos especiais, adaptações podem ser necessárias.

