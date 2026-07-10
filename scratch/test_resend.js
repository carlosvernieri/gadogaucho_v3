const fs = require('fs');
const path = require('path');

// Parse .env.local manualmente para obter as chaves
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error("Erro: Arquivo .env.local não encontrado na raiz do projeto!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const resendApiKey = env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error("Erro: RESEND_API_KEY não encontrada no arquivo .env.local!");
  process.exit(1);
}

console.log("RESEND_API_KEY encontrada:", resendApiKey.substring(0, 12) + "...");

async function testResend() {
  // Pega o e-mail passado como argumento (ex: node scratch/test_resend.js seu-email@exemplo.com)
  const toEmail = process.argv[2];
  
  if (!toEmail) {
    console.log("\n--- AVISO ---");
    console.log("Nenhum e-mail de destino foi especificado.");
    console.log("Uso: node scratch/test_resend.js seu-email-cadastrado-no-resend@dominio.com");
    console.log("-------------\n");
    process.exit(1);
  }

  console.log(`Enviando e-mail de teste para: ${toEmail}...`);
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Gado Gaúcho <onboarding@resend.dev>', // Domínio padrão de onboarding para testes
        to: toEmail,
        subject: 'Teste de Conexão com o Resend - Gado Gaúcho',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #2D5A27;">Conexão Resend Ativa!</h1>
            <p>Se você está lendo esta mensagem, a integração direta com a API do Resend no <strong>Gado Gaúcho</strong> está funcionando perfeitamente.</p>
            <hr style="border: 0; border-top: 1px border #eee; margin: 20px 0;"/>
            <small style="color: #999;">Gado Gaúcho &copy; 2026</small>
          </div>
        `
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log("\n✅ Sucesso! O e-mail foi enviado com sucesso via Resend.");
      console.log("ID da mensagem:", data.id);
    } else {
      console.error("\n❌ Erro retornado pela API do Resend:");
      console.error(JSON.stringify(data, null, 2));
      console.log("\nNota: Se você estiver usando a conta gratuita com o domínio padrão (onboarding@resend.dev), você SÓ pode enviar e-mails de teste para o próprio endereço de e-mail que você usou para criar a sua conta do Resend.");
    }
  } catch (err) {
    console.error("\n❌ Erro de conexão ao chamar a API do Resend:", err);
  }
}

testResend();
