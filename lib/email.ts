import { getAdminEmailSettings } from './alert-settings';

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

export async function sendNewListingAdminNotification(listing: any): Promise<boolean> {
  try {
    const adminSettings = await getAdminEmailSettings();
    const adminEmail = adminSettings.email;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gadogaucho.com.br';
    const adminUrl = `${siteUrl}/admin`;

    const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(listing.price || 0);
    const priceKg = listing.price_kg || listing.priceKg;
    const formattedPriceKg = priceKg
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(priceKg) + '/kg'
      : 'Não informado';

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Novo Anúncio Cadastrado - Gado Gaúcho</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f7f9fc;
            color: #333333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 30px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            border: 1px solid #e1e8ed;
          }
          .header {
            background: linear-gradient(135deg, #1b4332, #2d6a4f);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
          }
          .content {
            padding: 30px 25px;
          }
          .title {
            font-size: 18px;
            font-weight: 600;
            color: #1b4332;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .card {
            background-color: #f8f9fa;
            border-left: 4px solid #2d6a4f;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 8px 0;
            vertical-align: top;
          }
          .label {
            font-weight: 600;
            color: #666666;
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .value {
            color: #333333;
            font-weight: 500;
            font-size: 14px;
          }
          .btn-container {
            text-align: center;
            margin-top: 25px;
          }
          .btn {
            background-color: #2d6a4f;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 25px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            display: inline-block;
          }
          .footer {
            background-color: #f7f9fc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #888888;
            border-top: 1px solid #e1e8ed;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Gado Gaúcho</h1>
            <p>Painel de Controle do Administrador</p>
          </div>
          <div class="content">
            <div class="title">Novo Anúncio Cadastrado!</div>
            <p style="font-size: 14px; color: #555; line-height: 1.5; margin-bottom: 20px;">
              Um novo anúncio foi publicado na plataforma e requer atenção ou acompanhamento dos administradores.
            </p>
            
            <div class="card">
              <table class="info-table">
                <tr>
                  <td style="width: 50%;">
                    <span class="label">Código do Anúncio</span>
                    <span class="value" style="font-weight: 700; color: #2d6a4f;">#${listing.id}</span>
                  </td>
                  <td style="width: 50%;">
                    <span class="label">Título</span>
                    <span class="value">${listing.title}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="label">Categoria</span>
                    <span class="value">${listing.category}</span>
                  </td>
                  <td>
                    <span class="label">Raça</span>
                    <span class="value">${listing.breed || 'Não especificada'}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="label">Quantidade</span>
                    <span class="value">${listing.quantity} cabeças</span>
                  </td>
                  <td>
                    <span class="label">Peso Médio</span>
                    <span class="value">${listing.avg_weight || listing.avgWeight || 'Não informado'} kg</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="label">Preço Total</span>
                    <span class="value" style="color: #2d6a4f; font-weight: 700;">${formattedPrice}</span>
                  </td>
                  <td>
                    <span class="label">Preço por Kg</span>
                    <span class="value">${formattedPriceKg}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <span class="label">Localização</span>
                    <span class="value">${listing.location}</span>
                  </td>
                </tr>
                ${listing.description ? `
                <tr>
                  <td colspan="2" style="padding-top: 12px;">
                    <span class="label">Descrição</span>
                    <span class="value" style="font-style: italic; color: #666; display: block; background-color: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e9ecef; margin-top: 4px;">${listing.description}</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div class="btn-container">
              <a href="${adminUrl}" class="btn" target="_blank">Acessar Painel de Controle</a>
            </div>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático gerado pelo sistema de notificações administrativas do Gado Gaúcho.</p>
            <p>&copy; ${new Date().getFullYear()} Gado Gaúcho. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[Email Service] Enviando notificação de novo anúncio #${listing.id} para admin: ${adminEmail}`);

    return await sendEmail({
      to: adminEmail,
      subject: `[Gado Gaúcho] Novo anúncio cadastrado: #${listing.id} - ${listing.title}`,
      html: emailHtml
    });
  } catch (error) {
    console.error('Error sending new listing admin notification:', error);
    return false;
  }
}
