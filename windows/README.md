# A220 Wi-Fi Transferencias (prototipo Windows 10)

Este módulo agrega un panel web a A220 y un controlador local independiente. **No se activa desde un servidor remoto**: el navegador habla con un agente que se ejecuta en la misma PC.

## Requisitos y límites importantes

- Windows 10 en la PC que recibe Internet por Wi-Fi.
- Adaptador y controlador compatibles con la función heredada **Hosted Network / Red hospedada** de Windows.
- PowerShell 5.1 (incluido en Windows 10).
- El script necesita ejecutarse como administrador para configurar la red y el uso compartido de Internet.
- Muchos adaptadores modernos informan que Hosted Network no está disponible. Si ocurre, el panel lo indicará y no intentará simular que está activo. En ese caso habrá que implementar el controlador con la API Mobile Hotspot de Windows o usar un router/AP compatible.

## Primera prueba

1. Descargar el repositorio de esta rama en la PC del kiosco.
2. Abrir PowerShell como administrador en la carpeta del repositorio.
3. Ejecutar:

   `Set-ExecutionPolicy -Scope Process Bypass`
   
   `.\windows\a220-hotspot.ps1`

4. Copiar el código que aparece en la ventana de PowerShell.
5. Abrir A220 en esa misma PC, entrar en **Wi-Fi Transferencias**, pegar el código y pulsar **Vincular**.
6. Activar el hotspot desde el panel.

Red propuesta: `A220_TRANSFERENCIAS`. Clave inicial: `Transferir-A220-2026`. Cambiarla antes de ofrecer el acceso a clientes editando `$WifiPassword` en el script.

## Apagado automático

El controlador comprueba los clientes cada segundo. Al quedar cero clientes conectados, comienza una cuenta regresiva de 120 segundos; si vuelve a conectarse alguien, se reinicia. El controlador sigue ejecutándose aunque se cierre la página.

## Seguridad

- El servidor HTTP escucha exclusivamente en `127.0.0.1`; no abre un puerto en la LAN.
- Todas las operaciones requieren un token aleatorio generado localmente.
- El token se guarda en `%LOCALAPPDATA%\A220Hotspot\token.txt`; el panel solo lo conserva en el almacenamiento local de ese navegador.
- No se solicita ni almacena información bancaria.
- El Wi-Fi de clientes no debe tener acceso a los recursos compartidos del PC. La separación efectiva depende de la implementación del adaptador/ICS y debe probarse antes de usarlo con clientes.

## Estado

Prototipo de integración. Requiere prueba física con el adaptador Wi-Fi del kiosco; no publicar como funcional ni fusionar a producción antes de validar inicio, acceso a Internet, conteo de clientes y apagado a 120 segundos.
