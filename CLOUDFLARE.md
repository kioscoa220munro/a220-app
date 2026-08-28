# A220 Pro + Cloudflare

## Arquitectura

- `a220-app`: frontend estático servido con Workers Static Assets.
- `a220-api`: API privada separada; la app no contiene el token de GitHub.
- `a220-data`: repositorio de datos operativos privado.

## Wrangler

```bash
npm install
npx wrangler login
npm run check
npm run dev
npm run deploy
```

`wrangler.jsonc` es la fuente de verdad. El frontend usa Static Assets y Workers Logs/Observability.

## CI/CD

El workflow `.github/workflows/deploy-cloudflare.yml` despliega `main` automáticamente. Requiere dos secrets del repositorio:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

El token debe tener permisos para desplegar Workers en la cuenta correspondiente.

## Cloudflare MCP

Cloudflare mantiene servidores MCP remotos para documentación, Workers Bindings, Builds y Observability. Para clientes MCP modernos se usa Streamable HTTP en `/mcp`.

Servidores útiles:

- Documentation: `https://docs.mcp.cloudflare.com/mcp`
- Workers Bindings: `https://bindings.mcp.cloudflare.com/mcp`
- Workers Builds: `https://builds.mcp.cloudflare.com/mcp`
- Observability: `https://observability.mcp.cloudflare.com/mcp`

MCP debe autenticarse con la cuenta Cloudflare mediante OAuth; no se guardan tokens Cloudflare en este repositorio.

## Seguridad

No poner API keys, tokens, contraseñas, secretos de GitHub ni datos operativos en este repositorio público.
