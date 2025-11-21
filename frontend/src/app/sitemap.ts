import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://studentstore-zeta.vercel.app';

  async function fetchData(endpoint: string) {
    try {
      const res = await fetch(`${baseUrl}/api/${endpoint}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
      return await res.json();
    } catch (error) {
      console.error(error);
      return { data: [] };
    }
  }

  // Fetch all dynamic data from your backend APIs
  const productsResponse = await fetchData('products?limit=1000&page=1&sort=newest');
  const skillsResponse = await fetchData('skillstore-public/skills');
  const profilesResponse = await fetchData('users/public-profiles');

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/posts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Dynamic products
  const productRoutes = productsResponse.data?.products?.map((p: any) => ({
    url: `${baseUrl}/products/${p.id}`,
    lastModified: new Date(p.updated_at || p.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  })) || [];

  // Dynamic skills including skill resources
  const skillRoutes = skillsResponse.data?.map((s: any) => [
    {
      url: `${baseUrl}/skillstore/${s.id}`,
      lastModified: new Date(s.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/skillstore/${s.id}/resources`,
      lastModified: new Date(s.created_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]).flat() || [];

  // Dynamic public profiles
  const publicProfileRoutes = profilesResponse.data?.map((p: any) => ({
    url: `${baseUrl}/profile/${p.id}`,
    lastModified: new Date(p.updated_at || p.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  })) || [];

  return [...staticRoutes, ...productRoutes, ...skillRoutes, ...publicProfileRoutes];
}
