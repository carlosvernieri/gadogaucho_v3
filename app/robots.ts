import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Ajuste a URL do sitemap para corresponder ao seu domínio de produção se necessário
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.gadogaucho.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/meus-anuncios/',
        '/favoritos/',
        '/mensagens/',
        '/redefinir-senha/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
