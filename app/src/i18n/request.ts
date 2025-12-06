import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Get locale from cookie or browser preference
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('locale')?.value;
  
  // Default to browser locale or fallback to 'en'
  const locale = savedLocale || 'en';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
