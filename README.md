# A220 Pro

Aplicación de gestión de kiosco.

## Versiones

- **Producción estable:** rama `main`. Es la versión de uso diario y no se modifica durante el trabajo de la próxima versión.
- **Próxima versión / pruebas:** rama `refactor/a220-optimization`. Se usa para desarrollar, revisar y validar mejoras antes del cambio definitivo.
- **Respaldo:** rama `backup/estable-2026-11-10`. Copia de referencia de la versión estable al iniciar este ciclo.

## Regla de publicación

La próxima versión se prueba de forma independiente. No se integra a `main` ni se convierte en versión definitiva hasta que se validen las operaciones críticas y el usuario confirme el cambio.

Los datos operativos del comercio deben considerarse valiosos: no probar recuperación, sincronización ni ventas reales con datos únicos sin una copia de seguridad verificada.
