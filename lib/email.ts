/**
 * Utilitário para envio de e-mails no Gado Gaúcho.
 * Suporta o envio real via API do Resend (HTTP nativo, sem dependências adicionais)
 * e simulação em modo de desenvolvimento (logando no console).
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<boolean> {
  const sender = from || 'Gado Gaúcho <alertas@gadogaucho.com>';
  const resendApiKey = process.env.RESEND_API_KEY;

  console.log(`[Email Service] Preparando envio de e-mail para: ${to}`);
  console.log(`[Email Service] Assunto: ${subject}`);

  if (resendApiKey) {
    try {
      console.log('[Email Service] Enviando e-mail real via Resend API...');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: sender,
          to,
          subject,
          html
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Email Service] E-mail enviado com sucesso via Resend! ID: ${data.id}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`[Email Service] Erro retornado pela API do Resend:`, errorText);
        return false;
      }
    } catch (err) {
      console.error('[Email Service] Falha ao conectar com a API do Resend:', err);
      return false;
    }
  } else {
    // Modo simulação para desenvolvimento
    console.log('======================================================================');
    console.log(`[SIMULAÇÃO DE E-MAIL]`);
    console.log(`DE: ${sender}`);
    console.log(`PARA: ${to}`);
    console.log(`ASSUNTO: ${subject}`);
    console.log(`CONTEÚDO (HTML):`);
    console.log(html);
    console.log('======================================================================');
    console.log('[Email Service] E-mail simulado com sucesso (nenhuma chave RESEND_API_KEY configurada).');
    return true;
  }
}
