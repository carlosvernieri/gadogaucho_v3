const fetch = require('node-fetch');

async function testLogin() {
  const url = 'http://localhost:3000/api/auth/login';
  const payload = {
    email: 'admin@admin.com',
    password: 'admin'
  };

  console.log('--- Iniciando Teste de Login (Migração Legacy) ---');
  console.log('Payload:', payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ SUCESSO: O usuário foi migrado e logado!');
    } else {
      console.log('❌ FALHA: Verifique os logs do servidor para o erro exato.');
    }
  } catch (error) {
    console.error('❌ ERRO DE CONEXÃO:', error.message);
    console.log('Certifique-se de que o comando "npm run dev" ou "npm run start" está rodando na porta 3000.');
  }
}

testLogin();
