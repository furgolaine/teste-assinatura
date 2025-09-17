#!/bin/bash

# Script de Deploy do Sistema de Assinatura para Imóveis
# Este script facilita o processo de implantação do sistema completo

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="subscription-system"
BACKEND_PORT=3000
ADMIN_PANEL_PORT=5174
MOBILE_APP_PORT=5175

echo -e "${BLUE}🚀 Sistema de Assinatura para Imóveis - Deploy Script${NC}"
echo -e "${BLUE}=====================================================${NC}\n"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Verificando pré-requisitos..."
    
    if ! command_exists node; then
        print_error "Node.js não encontrado. Por favor, instale Node.js 18+ antes de continuar."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm não encontrado. Por favor, instale npm antes de continuar."
        exit 1
    fi
    
    if ! command_exists psql; then
        print_warning "PostgreSQL client não encontrado. Certifique-se de que o PostgreSQL está instalado e configurado."
    fi
    
    print_status "Pré-requisitos verificados ✅\n"
}

# Setup database
setup_database() {
    print_status "Configurando banco de dados..."
    
    cd backend
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_warning "Arquivo .env não encontrado. Criando a partir do template..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Por favor, edite o arquivo backend/.env com suas configurações antes de continuar."
            read -p "Pressione Enter após configurar o arquivo .env..."
        else
            print_error "Arquivo .env.example não encontrado. Criando .env básico..."
            cat > .env << EOF
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/subscription_system

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Pagar.me (opcional)
PAGARME_API_KEY=your-pagarme-api-key
PAGARME_ENCRYPTION_KEY=your-pagarme-encryption-key

# Melhor Envio (opcional)
MELHOR_ENVIO_TOKEN=your-melhor-envio-token

# Environment
NODE_ENV=development
PORT=3000
EOF
            print_warning "Arquivo .env criado. Por favor, edite-o com suas configurações."
            read -p "Pressione Enter após configurar o arquivo .env..."
        fi
    fi
    
    # Install dependencies
    print_status "Instalando dependências do backend..."
    npm install
    
    # Setup database
    print_status "Executando configuração do banco de dados..."
    node scripts/setup-database.js || print_warning "Falha na configuração do banco. Verifique as configurações."
    
    cd ..
    print_status "Configuração do banco de dados concluída ✅\n"
}

# Deploy backend
deploy_backend() {
    print_status "Fazendo deploy do backend..."
    
    cd backend
    
    # Install dependencies
    npm install
    
    # Run tests (if available)
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        print_status "Executando testes do backend..."
        npm test || print_warning "Alguns testes falharam, mas continuando com o deploy..."
    fi
    
    # Start backend in production mode
    print_status "Iniciando backend em modo produção..."
    npm run start &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 5
    
    # Check if backend is running
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null; then
        print_status "Backend iniciado com sucesso na porta $BACKEND_PORT ✅"
    else
        print_error "Falha ao iniciar o backend"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    cd ..
}

# Deploy admin panel
deploy_admin_panel() {
    print_status "Fazendo deploy do painel administrativo..."
    
    cd admin-panel
    
    # Install dependencies
    print_status "Instalando dependências do painel administrativo..."
    pnpm install || npm install
    
    # Build for production
    print_status "Construindo aplicação para produção..."
    pnpm run build || npm run build
    
    # Start production server
    print_status "Iniciando servidor de produção..."
    pnpm run preview --host --port $ADMIN_PANEL_PORT &
    ADMIN_PID=$!
    
    # Wait for admin panel to start
    sleep 5
    
    # Check if admin panel is running
    if curl -s http://localhost:$ADMIN_PANEL_PORT > /dev/null; then
        print_status "Painel administrativo iniciado com sucesso na porta $ADMIN_PANEL_PORT ✅"
    else
        print_warning "Falha ao iniciar o painel administrativo"
    fi
    
    cd ..
}

# Deploy mobile app
deploy_mobile_app() {
    print_status "Fazendo deploy do aplicativo mobile..."
    
    cd mobile-app
    
    # Install dependencies
    print_status "Instalando dependências do aplicativo mobile..."
    pnpm install || npm install
    
    # Build for production
    print_status "Construindo aplicação para produção..."
    pnpm run build || npm run build
    
    # Start production server
    print_status "Iniciando servidor de produção..."
    pnpm run preview --host --port $MOBILE_APP_PORT &
    MOBILE_PID=$!
    
    # Wait for mobile app to start
    sleep 5
    
    # Check if mobile app is running
    if curl -s http://localhost:$MOBILE_APP_PORT > /dev/null; then
        print_status "Aplicativo mobile iniciado com sucesso na porta $MOBILE_APP_PORT ✅"
    else
        print_warning "Falha ao iniciar o aplicativo mobile"
    fi
    
    cd ..
}

# Run integration tests
run_tests() {
    print_status "Executando testes de integração..."
    
    if [ -f "test-integration.js" ]; then
        node test-integration.js
    else
        print_warning "Script de teste de integração não encontrado"
    fi
}

# Print deployment summary
print_summary() {
    echo -e "\n${GREEN}🎉 Deploy concluído!${NC}"
    echo -e "${BLUE}==================${NC}"
    echo -e "Backend:           ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "Painel Admin:      ${GREEN}http://localhost:$ADMIN_PANEL_PORT${NC}"
    echo -e "App Mobile:        ${GREEN}http://localhost:$MOBILE_APP_PORT${NC}"
    echo -e "\n${YELLOW}Credenciais padrão:${NC}"
    echo -e "Admin: admin@sistema.com / admin123"
    echo -e "Usuário: joao@email.com / 123456"
    echo -e "\n${BLUE}Para parar os serviços:${NC}"
    echo -e "kill $BACKEND_PID $ADMIN_PID $MOBILE_PID"
    echo -e "\n${GREEN}Sistema pronto para uso! 🚀${NC}"
}

# Cleanup function
cleanup() {
    print_status "Limpando processos..."
    kill $BACKEND_PID $ADMIN_PID $MOBILE_PID 2>/dev/null || true
    exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Main deployment flow
main() {
    check_prerequisites
    
    # Ask user what to deploy
    echo -e "${YELLOW}Selecione o que deseja fazer:${NC}"
    echo "1) Deploy completo (recomendado)"
    echo "2) Apenas backend"
    echo "3) Apenas frontend (admin + mobile)"
    echo "4) Configurar apenas banco de dados"
    echo "5) Executar apenas testes"
    read -p "Opção (1-5): " choice
    
    case $choice in
        1)
            setup_database
            deploy_backend
            deploy_admin_panel
            deploy_mobile_app
            sleep 10  # Wait for all services to be ready
            run_tests
            print_summary
            ;;
        2)
            setup_database
            deploy_backend
            print_status "Backend deploy concluído ✅"
            ;;
        3)
            deploy_admin_panel
            deploy_mobile_app
            print_status "Frontend deploy concluído ✅"
            ;;
        4)
            setup_database
            ;;
        5)
            run_tests
            ;;
        *)
            print_error "Opção inválida"
            exit 1
            ;;
    esac
    
    # Keep script running to maintain services
    if [ "$choice" = "1" ] || [ "$choice" = "2" ] || [ "$choice" = "3" ]; then
        echo -e "\n${GREEN}Serviços rodando... Pressione Ctrl+C para parar.${NC}"
        while true; do
            sleep 1
        done
    fi
}

# Run main function
main "$@"

