import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/booking`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];
}

