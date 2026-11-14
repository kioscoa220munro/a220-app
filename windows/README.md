# A220 Wi-Fi Transferencias · Windows 10

El panel web de A220 se comunica con un controlador local instalado en la misma PC. El controlador utiliza la API oficial `NetworkOperatorTetheringManager` de Windows Mobile Hotspot, no el método heredado Hosted Network.

## Requisitos

- Windows 10 versión 2004 (build 19041) o posterior recomendado.
- Intel Wireless-AC 9461: compatible con Mobile Hotspot mediante Wi-Fi Direct; el indicador “Red hospedada admitida: no” solo descarta el método heredado.
- Conexión a Internet activa en la PC.
- .NET 8 SDK y Windows 10 SDK (MakeAppx y SignTool) para compilar el paquete.
- PowerShell 5.1 (incluido en Windows 10).

## Compilar e instalar

1. Descargar esta rama completa en la PC del kiosco.
2. Abrir PowerShell en la carpeta del repositorio.
3. Ejecutar:

   `Set-ExecutionPolicy -Scope Process Bypass`

   `.windows\Build-A220Bridge.ps1`

4. Abrir **A220 Wi-Fi Transferencias** desde el menú Inicio.
5. Copiar el código que muestra la ventana del controlador.
6. Abrir A220 Ventas en esa misma PC, entrar en **Wi-Fi Transferencias**, pegar el código y pulsar **Vincular**.
7. Activar y apagar el punto de acceso desde el panel de A220.

El instalador crea un certificado local de firma para instalar el paquete en esta PC. No se publica ni se instala nada en el servidor de producción.

## Funcionamiento

- API Windows Mobile Hotspot: activa/desactiva el punto de acceso y configura SSID y clave.
- SSID: `A220_TRANSFERENCIAS`.
- La clave se genera localmente y se muestra en el panel; no se reciben ni guardan datos bancarios.
- El controlador consulta el número real de clientes conectados.
- Al quedar cero clientes, comienza un período de 120 segundos. Si vuelve a conectarse alguien, el conteo se reinicia.
- El temporizador corre en el controlador local, aunque se cierre la pestaña de A220.
- El puente HTTP escucha solo en `127.0.0.1:8765` y exige un token aleatorio.

## Seguridad y validaciones pendientes

El hotspot comparte Internet a través de Windows. Antes de habilitarlo para clientes hay que probar desde otro teléfono que navegue correctamente y que no pueda acceder a recursos compartidos ni servicios locales de la PC. La API de tethering no sustituye esa prueba de aislamiento.

## Estado de esta rama

La integración del panel y el código fuente del controlador están preparados en esta rama. **Todavía no está validado con una compilación e instalación real en la PC del kiosco.** No fusionar ni publicar en producción hasta completar esas pruebas. El antiguo `a220-hotspot.ps1` quedó deshabilitado porque usaba Hosted Network, incompatible con el adaptador informado.
