import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://blockchess.app';
  
  // Get current date for lastModified
  const now = new Date();
  
  // Static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 1.0,
      alternates: {
        languages: {
          en: `${baseUrl}/en`,
          fr: `${baseUrl}/fr`,
        },
      },
    },
    {
      url: `${baseUrl}/history`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
      alternates: {
        languages: {
          en: `${baseUrl}/en/history`,
          fr: `${baseUrl}/fr/history`,
        },
      },
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
      alternates: {
        languages: {
          en: `${baseUrl}/en/profile`,
          fr: `${baseUrl}/fr/profile`,
        },
      },
    },
    {
      url: `${baseUrl}/rewards`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
      alternates: {
        languages: {
          en: `${baseUrl}/en/rewards`,
          fr: `${baseUrl}/fr/rewards`,
        },
      },
    },
  ];

  return routes;
}

