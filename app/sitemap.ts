import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { getListingUrl } from '@/lib/utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gadogaucho.com';

  // Rotas estáticas principais do site
  const staticRoutes = [
    '',
    '/precodogado',
    '/relatorio-preco-do-gado',
    '/contato',
    '/politica-de-privacidade',
    '/termos',
  ];

  const routes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Buscar listagens ativas do banco de dados para incluir no sitemap
  try {
    const { data: listings } = await (supabaseAdmin
      .from('listings') as any)
      .select('id, category, breed, location, updated_at')
      .eq('sold', false);

    if (listings && listings.length > 0) {
      listings.forEach((l: any) => {
        const path = getListingUrl(l);
        routes.push({
          url: `${baseUrl}${path}`,
          lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      });
    }
  } catch (error) {
    console.error('Error fetching listings for sitemap:', error);
  }

  return routes;
}
