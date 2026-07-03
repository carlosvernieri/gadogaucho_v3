import { supabaseAdmin } from './supabase';
import { sendEmail } from './email';
import { getListingUrl, formatCityName } from './utils';
import { getAlertSettings } from './alert-settings';

interface NewListingData {
  id: number;
  category: string;
  breed?: string | null;
  title: string;
  price: number;
  price_kg?: number | null;
  avg_weight?: number | null;
  quantity: number;
  location: string;
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  category_id?: number | null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Dispara e-mails de alerta para possíveis compradores que cadastraram demandas
 * compatíveis com a nova oferta inserida no site.
 */
export async function triggerOpportunityAlerts(listing: NewListingData) {
  try {
    // 0. Verificar se os disparos de e-mail estão pausados pelo administrador
    const settings = await getAlertSettings();
    if (settings.paused) {
      console.log(`[Alerts Dispatcher] O envio de alertas automáticos está pausado pelo administrador. Pulando disparos.`);
      return;
    }

    const categoryId = listing.category_id;
    if (!categoryId) {
      console.log(`[Alerts Dispatcher] O anúncio #${listing.id} não possui category_id. Pulando disparos.`);
      return;
    }

    console.log(`[Alerts Dispatcher] Buscando alertas para a categoria ID: ${categoryId} (Anúncio #${listing.id})...`);

    // Buscar os alertas cadastrados para essa categoria
    const { data: alerts, error } = await supabaseAdmin
      .from('opportunity_alerts')
      .select('*')
      .eq('category_id', categoryId);

    if (error) {
      console.error('[Alerts Dispatcher] Erro ao buscar alertas de oportunidades:', error);
      return;
    }

    if (!alerts || alerts.length === 0) {
      console.log(`[Alerts Dispatcher] Nenhum alerta correspondente encontrado para a categoria ID ${categoryId}.`);
      return;
    }

    // Filtrar os alertas com base nos limites de preço, peso e distância
    const matchedAlerts = alerts.filter((alert: any) => {
      // 1. Proximidade de Localização
      if (
        alert.lat !== null && alert.lat !== undefined &&
        alert.lng !== null && alert.lng !== undefined &&
        listing.lat !== null && listing.lat !== undefined &&
        listing.lng !== null && listing.lng !== undefined
      ) {
        const dist = calculateDistance(
          Number(alert.lat), Number(alert.lng),
          Number(listing.lat), Number(listing.lng)
        );
        const limit = settings.maxDistance || 100;
        if (dist > limit) {
          console.log(`[Alerts Dispatcher] Descartando alerta #${alert.id} (${alert.email}): Distância entre municípios (${dist.toFixed(1)} km) excede o limite configurado (${limit} km).`);
          return false;
        }
      }

      // Preço Mínimo (por kg)
      if (alert.min_price !== null && alert.min_price !== undefined) {
        if (!listing.price_kg || Number(listing.price_kg) < Number(alert.min_price)) {
          console.log(`[Alerts Dispatcher] Descartando alerta #${alert.id} (${alert.email}): Preço por kg do anúncio (${listing.price_kg || 0}) é menor que o preço por kg mínimo do alerta (${alert.min_price}).`);
          return false;
        }
      }
      // Preço Máximo (por kg)
      if (alert.max_price !== null && alert.max_price !== undefined) {
        if (!listing.price_kg || Number(listing.price_kg) > Number(alert.max_price)) {
          console.log(`[Alerts Dispatcher] Descartando alerta #${alert.id} (${alert.email}): Preço por kg do anúncio (${listing.price_kg || 0}) é maior que o preço por kg máximo do alerta (${alert.max_price}).`);
          return false;
        }
      }
      // Peso Mínimo
      if (alert.min_weight !== null && alert.min_weight !== undefined) {
        if (!listing.avg_weight || Number(listing.avg_weight) < Number(alert.min_weight)) {
          console.log(`[Alerts Dispatcher] Descartando alerta #${alert.id} (${alert.email}): Peso médio do anúncio (${listing.avg_weight || 0} kg) é menor que o peso mínimo do alerta (${alert.min_weight} kg).`);
          return false;
        }
      }
      // Peso Máximo
      if (alert.max_weight !== null && alert.max_weight !== undefined) {
        if (!listing.avg_weight || Number(listing.avg_weight) > Number(alert.max_weight)) {
          console.log(`[Alerts Dispatcher] Descartando alerta #${alert.id} (${alert.email}): Peso médio do anúncio (${listing.avg_weight || 0} kg) é maior que o peso máximo do alerta (${alert.max_weight} kg).`);
          return false;
        }
      }
      return true;
    });

    if (matchedAlerts.length === 0) {
      console.log(`[Alerts Dispatcher] Nenhum alerta atendeu aos critérios de preço/peso para o anúncio #${listing.id}.`);
      return;
    }

    console.log(`[Alerts Dispatcher] Encontrado(s) ${matchedAlerts.length} alerta(s) de oportunidade compatível(is). Enviando e-mails...`);

    // Obter URL base do site
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gadogaucho.com.br';
    
    // Obter URL do anúncio usando a função de utilidade existente
    const listingUrl = `${siteUrl}${getListingUrl(listing)}`;

    // Formatar valores para exibição
    const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(listing.price);
    const formattedPriceKg = listing.price_kg 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(listing.price_kg) + '/kg'
      : 'Não informado';
    const formattedWeight = listing.avg_weight ? `${listing.avg_weight} kg` : 'Não informado';
    const formattedLocation = formatCityName(listing.location);

    // Enviar e-mails em paralelo (sem travar a resposta principal do servidor)
    const emailPromises = matchedAlerts.map(async (alert: any) => {
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nova Oportunidade no Gado Gaúcho</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f7f9fc;
              color: #333333;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
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
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 30px 25px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1b4332;
              margin-top: 0;
              margin-bottom: 15px;
            }
            .description-text {
              font-size: 15px;
              line-height: 1.6;
              color: #555555;
              margin-bottom: 25px;
            }
            .opportunity-card {
              background-color: #f4f9f4;
              border-left: 4px solid #52b788;
              border-radius: 6px;
              padding: 20px;
              margin-bottom: 25px;
            }
            .opportunity-title {
              font-size: 18px;
              font-weight: 700;
              color: #2d6a4f;
              margin-top: 0;
              margin-bottom: 12px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .info-item {
              font-size: 14px;
            }
            .info-label {
              font-weight: 600;
              color: #666666;
              display: block;
              margin-bottom: 2px;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              color: #333333;
              font-weight: 500;
              font-size: 15px;
            }
            .btn-container {
              text-align: center;
              margin-top: 30px;
              margin-bottom: 15px;
            }
            .btn {
              background-color: #52b788;
              color: #ffffff !important;
              text-decoration: none;
              padding: 14px 30px;
              font-size: 16px;
              font-weight: 600;
              border-radius: 8px;
              display: inline-block;
              transition: background-color 0.2s ease;
              box-shadow: 0 4px 6px rgba(82, 183, 136, 0.25);
            }
            .footer {
              background-color: #f7f9fc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #888888;
              border-top: 1px solid #e1e8ed;
            }
            .footer p {
              margin: 5px 0;
            }
            .footer a {
              color: #52b788;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Gado Gaúcho</h1>
              <p>Alerta de Oportunidades</p>
            </div>
            
            <div class="content">
              <p class="greeting">Olá, ${alert.name}!</p>
              <p class="description-text">
                Temos boas notícias! Um produtor acaba de cadastrar uma nova oferta no site do <strong>Gado Gaúcho</strong> que corresponde à sua busca de interesse na categoria <strong>${listing.category}</strong>.
              </p>
              
              <div class="opportunity-card">
                <div class="opportunity-title">${listing.title}</div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; width: 50%; vertical-align: top;">
                      <span class="info-label">Categoria</span>
                      <span class="info-value">${listing.category}</span>
                    </td>
                    <td style="padding: 6px 0; width: 50%; vertical-align: top;">
                      <span class="info-label">Quantidade</span>
                      <span class="info-value">${listing.quantity} cabeças</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top;">
                      <span class="info-label">Preço Total</span>
                      <span class="info-value" style="color: #2d6a4f; font-weight: 700;">${formattedPrice}</span>
                    </td>
                    <td style="padding: 6px 0; vertical-align: top;">
                      <span class="info-label">Preço por kg</span>
                      <span class="info-value">${formattedPriceKg}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; vertical-align: top;">
                      <span class="info-label">Peso Médio</span>
                      <span class="info-value">${formattedWeight}</span>
                    </td>
                    <td style="padding: 6px 0; vertical-align: top;">
                      <span class="info-label">Localização</span>
                      <span class="info-value">${formattedLocation}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p class="description-text">
                Recomendamos entrar em contato com o vendedor o quanto antes, pois ofertas com boas condições costumam ser vendidas rapidamente!
              </p>
              
              <div class="btn-container">
                <a href="${listingUrl}" class="btn" target="_blank">Visualizar Oferta Completa</a>
              </div>
            </div>
            
            <div class="footer">
              <p>Este e-mail foi enviado automaticamente pelo sistema de alertas do Gado Gaúcho.</p>
              <p>Deseja parar de receber estes alertas? <a href="${siteUrl}/alertas/cancelar?id=${alert.id}">Clique aqui para cancelar</a>.</p>
              <p>&copy; ${new Date().getFullYear()} Gado Gaúcho. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: alert.email,
        subject: `[Gado Gaúcho] Nova Oportunidade de ${listing.category} disponível!`,
        html: emailHtml
      });
    });

    await Promise.all(emailPromises);
    console.log('[Alerts Dispatcher] Todos os e-mails de alerta foram processados.');
  } catch (err) {
    console.error('[Alerts Dispatcher] Exceção crítica ao disparar alertas de oportunidades:', err);
  }
}
