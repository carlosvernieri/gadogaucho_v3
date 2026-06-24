import { MetadataRoute } from 'next';

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

  const routes = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  return [...routes];
}
