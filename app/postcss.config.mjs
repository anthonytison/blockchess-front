/** @type {import('postcss-load-config').Config} */
const config = (ctx) => {
  // Skip Tailwind processing for node_modules CSS files
  // This prevents conflicts with packages like @mysten/dapp-kit that use Tailwind v3
  const isNodeModules = ctx.file?.includes('node_modules');
  
  const plugins = {};
  
  if (!isNodeModules) {
    plugins['@tailwindcss/postcss'] = {};
  }
  
  plugins['autoprefixer'] = {};
  
  return { plugins };
};

export default config;