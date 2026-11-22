export async function resolve(specifier, context, next) {
  if (specifier.endsWith('/sqlite-preview.mjs') && !context.parentURL?.includes('/hosting/')) return next(new URL('./pg-preview.mjs', import.meta.url).href, context);
  return next(specifier, context);
}
