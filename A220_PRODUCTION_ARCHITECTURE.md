# A220 Pro — Production Architecture

## Principles
- Private data is scoped to the authenticated Supabase user.
- No authentication means no private business data.
- Local-first operation: sales and product changes never depend on network availability.
- Synchronization is automatic and versioned; manual GitHub synchronization is retired.
- Microframes are the modular data units for future incremental synchronization.
- Public catalog data is isolated from private business data.
- Reader and 58 mm thermal printer are first-class POS integrations.
- Legacy code is preserved outside the production path until explicitly retired.

## Production flow
Google/Supabase Auth -> A220 Core -> local store -> automatic sync -> private cloud data.

## POS flow
Barcode scanner -> local product lookup -> cart -> sale -> stock update -> receipt print -> sync queue.

## Deployment gate
Do not promote a build to production until auth, private-data isolation, local persistence, sync, barcode input and printer output pass end-to-end tests.
