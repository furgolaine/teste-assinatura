#!/usr/bin/env node

/**
 * Script de Teste de Integração
 * Verifica se todos os componentes do sistema estão funcionando corretamente
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3000';
const ADMIN_PANEL_URL = 'http://localhost:5174';
const MOBILE_APP_URL = 'http://localhost:5175';

class IntegrationTester {
  constructor() {
    this.results = {
      backend: { status: 'pending', tests: [] },
      adminPanel: { status: 'pending', tests: [] },
      mobileApp: { status: 'pending', tests: [] },
      integration: { status: 'pending', tests: [] }
    };
  }

  async runTests() {
    console.log('🚀 Iniciando testes de integração...\n');

    try {
      await this.testBackend();
      await this.testFrontends();
      await this.testIntegration();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Erro durante os testes:', error.message);
      process.exit(1);
    }
  }

  async testBackend() {
    console.log('🔧 Testando Backend...');
    
    try {
      // Test 1: Health check
      const healthResponse = await axios.get(`${BACKEND_URL}/health`);
      this.addResult('backend', 'Health Check', healthResponse.status === 200);

      // Test 2: Database connection
      const dbResponse = await axios.get(`${BACKEND_URL}/api/health/db`);
      this.addResult('backend', 'Database Connection', dbResponse.status === 200);

      // Test 3: Authentication endpoint
      try {
        await axios.post(`${BACKEND_URL}/api/auth/login`, {
          email: 'invalid@email.com',
          password: 'invalid'
        });
      } catch (error) {
        // Should return 401 for invalid credentials
        this.addResult('backend', 'Authentication Endpoint', error.response?.status === 401);
      }

      // Test 4: Plans endpoint (public)
      const plansResponse = await axios.get(`${BACKEND_URL}/api/plans`);
      this.addResult('backend', 'Plans API', plansResponse.status === 200);

      this.results.backend.status = 'completed';
      console.log('✅ Backend tests completed\n');

    } catch (error) {
      this.results.backend.status = 'failed';
      console.log('❌ Backend tests failed:', error.message, '\n');
    }
  }

  async testFrontends() {
    console.log('🌐 Testando Frontends...');

    // Test Admin Panel
    try {
      const adminResponse = await axios.get(ADMIN_PANEL_URL);
      this.addResult('adminPanel', 'Admin Panel Loading', adminResponse.status === 200);
      this.addResult('adminPanel', 'Admin Panel Title', adminResponse.data.includes('Painel Administrativo'));
      this.results.adminPanel.status = 'completed';
    } catch (error) {
      this.results.adminPanel.status = 'failed';
      this.addResult('adminPanel', 'Admin Panel Loading', false);
    }

    // Test Mobile App
    try {
      const mobileResponse = await axios.get(MOBILE_APP_URL);
      this.addResult('mobileApp', 'Mobile App Loading', mobileResponse.status === 200);
      this.addResult('mobileApp', 'Mobile App Title', mobileResponse.data.includes('App Proprietário'));
      this.results.mobileApp.status = 'completed';
    } catch (error) {
      this.results.mobileApp.status = 'failed';
      this.addResult('mobileApp', 'Mobile App Loading', false);
    }

    console.log('✅ Frontend tests completed\n');
  }

  async testIntegration() {
    console.log('🔗 Testando Integração...');

    try {
      // Test 1: Admin login flow
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@sistema.com',
        password: 'admin123'
      });
      
      const token = loginResponse.data.token;
      this.addResult('integration', 'Admin Login', !!token);

      // Test 2: Authenticated API call
      const authHeaders = { Authorization: `Bearer ${token}` };
      const subscriptionsResponse = await axios.get(`${BACKEND_URL}/api/subscriptions`, { headers: authHeaders });
      this.addResult('integration', 'Authenticated API Access', subscriptionsResponse.status === 200);

      // Test 3: User registration
      const randomEmail = `test${Date.now()}@email.com`;
      const registerResponse = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        name: 'Test User',
        email: randomEmail,
        password: '123456'
      });
      this.addResult('integration', 'User Registration', registerResponse.status === 201);

      this.results.integration.status = 'completed';
      console.log('✅ Integration tests completed\n');

    } catch (error) {
      this.results.integration.status = 'failed';
      console.log('❌ Integration tests failed:', error.message, '\n');
    }
  }

  addResult(component, testName, passed) {
    this.results[component].tests.push({
      name: testName,
      passed: passed,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    console.log('📊 RESULTADOS DOS TESTES\n');
    console.log('=' .repeat(50));

    Object.entries(this.results).forEach(([component, result]) => {
      const componentName = component.charAt(0).toUpperCase() + component.slice(1);
      const statusIcon = result.status === 'completed' ? '✅' : result.status === 'failed' ? '❌' : '⏳';
      
      console.log(`\n${statusIcon} ${componentName} (${result.status})`);
      console.log('-'.repeat(30));

      result.tests.forEach(test => {
        const testIcon = test.passed ? '✅' : '❌';
        console.log(`  ${testIcon} ${test.name}`);
      });
    });

    // Summary
    const totalTests = Object.values(this.results).reduce((sum, result) => sum + result.tests.length, 0);
    const passedTests = Object.values(this.results).reduce((sum, result) => 
      sum + result.tests.filter(test => test.passed).length, 0);

    console.log('\n' + '='.repeat(50));
    console.log(`📈 RESUMO: ${passedTests}/${totalTests} testes passaram`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Todos os testes passaram! Sistema funcionando corretamente.');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique os componentes marcados.');
    }

    // Save results to file
    const resultsFile = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`📄 Resultados salvos em: ${resultsFile}`);
  }
}

// Check if all services are running
async function checkServices() {
  console.log('🔍 Verificando se os serviços estão rodando...\n');

  const services = [
    { name: 'Backend', url: BACKEND_URL },
    { name: 'Admin Panel', url: ADMIN_PANEL_URL },
    { name: 'Mobile App', url: MOBILE_APP_URL }
  ];

  for (const service of services) {
    try {
      await axios.get(service.url, { timeout: 5000 });
      console.log(`✅ ${service.name} está rodando (${service.url})`);
    } catch (error) {
      console.log(`❌ ${service.name} não está acessível (${service.url})`);
      console.log(`   Certifique-se de que o serviço está rodando antes de executar os testes.\n`);
      process.exit(1);
    }
  }
  console.log('');
}

// Main execution
async function main() {
  await checkServices();
  
  const tester = new IntegrationTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;

