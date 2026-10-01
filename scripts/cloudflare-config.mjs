// Production routes are supplied by Cloudflare Builds, never inferred from DNS.
export function configureDeployment(base, env, mode) {
  const config = structuredClone(base);
  const route = env.CLOUDFLARE_ROUTE;
  const zone = env.CLOUDFLARE_ZONE_ID;
  if (mode === 'staging') {
    if (route || zone || config.routes?.length) throw new Error('Staging must have no production route settings.');
    config.routes = [];
    return config;
  }
  if (mode !== 'production') throw new Error('Unknown deployment mode.');
  if (!route || !zone) throw new Error('Production requires CLOUDFLARE_ROUTE and CLOUDFLARE_ZONE_ID in Cloudflare build variables.');
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\/\*$/i.test(route) || !/^[a-f0-9]{32}$/i.test(zone)) {
    throw new Error('Expected one exact hostname/* route and a zone ID.');
  }
  config.routes = [{pattern:route, zone_id:zone}];
  return config;
}
