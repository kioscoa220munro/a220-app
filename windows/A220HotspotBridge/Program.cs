using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Windows.Networking.Connectivity;
using Windows.Networking.NetworkOperators;

namespace A220HotspotBridge;

internal static class Program
{
    private const int Port = 8765;
    private const int IdleSeconds = 120;
    private const string Ssid = "A220_TRANSFERENCIAS";
    private static readonly string DataDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "A220Hotspot");
    private static readonly string TokenPath = Path.Combine(DataDir, "token.txt");
    private static readonly string PasswordPath = Path.Combine(DataDir, "wifi-password.txt");
    private static readonly string Token = ReadOrCreate(TokenPath, 32);
    private static readonly string Password = ReadOrCreate(PasswordPath, 20, true);
    private static DateTime? _lastClientSeen;
    private static string? _lastError;
    private static NetworkOperatorTetheringManager? _manager;

    [STAThread]
    private static async Task Main()
    {
        Directory.CreateDirectory(DataDir);
        Console.Title = "A220 Wi-Fi Transferencias";
        Console.WriteLine("A220 WI-FI TRANSFERENCIAS · Controlador Windows 10");
        Console.WriteLine("Código para vincular desde A220:");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine(Token);
        Console.ResetColor();
        Console.WriteLine("SSID: " + Ssid);
        Console.WriteLine("La clave Wi-Fi se muestra en el panel A220.");
        Console.WriteLine("Dejá esta aplicación abierta mientras uses el punto de acceso.");
        using var listener = new HttpListener();
        listener.Prefixes.Add($"http://127.0.0.1:{Port}/");
        listener.Start();
        Console.WriteLine($"Escuchando únicamente en http://127.0.0.1:{Port}/");
        _ = Task.Run(async () =>
        {
            while (listener.IsListening)
            {
                await Task.Delay(1000);
                await MaintainIdleShutdown();
            }
        });
        while (listener.IsListening)
        {
            var context = await listener.GetContextAsync();
            _ = Task.Run(() => Handle(context));
        }
    }

    private static async Task Handle(HttpListenerContext context)
    {
        try
        {
            var req = context.Request;
            var res = context.Response;
            res.Headers["Access-Control-Allow-Origin"] = "*";
            res.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
            res.Headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
            res.Headers["Access-Control-Allow-Private-Network"] = "true";
            if (req.HttpMethod == "OPTIONS") { res.StatusCode = 204; res.Close(); return; }
            if (!string.Equals(req.Headers["Authorization"], "Bearer " + Token, StringComparison.Ordinal))
            { await Reply(res, new { ok = false, error = "Código de conexión inválido." }, 401); return; }

            switch (req.Url?.AbsolutePath)
            {
                case "/status":
                    await Reply(res, await Status()); break;
                case "/start":
                    await StartHotspot();
                    await Reply(res, await Status()); break;
                case "/stop":
                    await StopHotspot();
                    await Reply(res, await Status()); break;
                default:
                    await Reply(res, new { ok = false, error = "Ruta no encontrada." }, 404); break;
            }
        }
        catch (Exception ex)
        {
            _lastError = ex.GetBaseException().Message;
            try { await Reply(context.Response, new { ok = false, error = _lastError }, 500); } catch { }
        }
    }

    private static NetworkOperatorTetheringManager Manager()
    {
        var profile = NetworkInformation.GetInternetConnectionProfile()
            ?? throw new InvalidOperationException("Windows no detecta una conexión a Internet activa. Conectá primero la PC a Internet.");
        var capability = NetworkOperatorTetheringManager.GetTetheringCapabilityFromConnectionProfile(profile);
        if (capability != TetheringCapability.Enabled)
            throw new InvalidOperationException("Windows no habilita Mobile Hotspot para la conexión actual. Estado: " + capability);
        return NetworkOperatorTetheringManager.CreateFromConnectionProfile(profile);
    }

    private static async Task StartHotspot()
    {
        _manager = Manager();
        var config = new NetworkOperatorTetheringAccessPointConfiguration
        {
            Ssid = Ssid,
            Passphrase = Password
        };
        var configured = await _manager.ConfigureAccessPointAsync(config);
        if (configured.Status != TetheringOperationStatus.Success)
            throw new InvalidOperationException("Windows no pudo configurar el punto de acceso: " + configured.Status + " " + configured.AdditionalErrorMessage);
        try { await _manager.DisableNoConnectionsTimeoutAsync(); } catch { }
        var result = await _manager.StartTetheringAsync();
        if (result.Status != TetheringOperationStatus.Success)
            throw new InvalidOperationException("Windows no pudo encender Mobile Hotspot: " + result.Status + " " + result.AdditionalErrorMessage);
        _lastClientSeen = DateTime.UtcNow;
        _lastError = null;
    }

    private static async Task StopHotspot()
    {
        _manager ??= Manager();
        var result = await _manager.StopTetheringAsync();
        if (result.Status != TetheringOperationStatus.Success)
            throw new InvalidOperationException("Windows no pudo apagar Mobile Hotspot: " + result.Status + " " + result.AdditionalErrorMessage);
        _lastClientSeen = null;
        _lastError = null;
    }

    private static async Task<object> Status()
    {
        _manager ??= Manager();
        var state = _manager.TetheringOperationalState;
        var enabled = state == TetheringOperationalState.On;
        var clients = enabled ? _manager.GetTetheringClients().Count : 0;
        if (enabled && clients > 0) _lastClientSeen = DateTime.UtcNow;
        if (enabled && clients == 0 && _lastClientSeen is null) _lastClientSeen = DateTime.UtcNow;
        var remaining = enabled && clients == 0 && _lastClientSeen.HasValue
            ? Math.Max(0, IdleSeconds - (int)(DateTime.UtcNow - _lastClientSeen.Value).TotalSeconds) : 0;
        return new { ok = true, supported = true, enabled, clients, secondsRemaining = remaining,
            internetSharing = enabled, ssid = Ssid, password = Password, error = _lastError };
    }

    private static async Task MaintainIdleShutdown()
    {
        try
        {
            if (_manager is null) return;
            if (_manager.TetheringOperationalState != TetheringOperationalState.On) return;
            if (_manager.GetTetheringClients().Count > 0) { _lastClientSeen = DateTime.UtcNow; return; }
            _lastClientSeen ??= DateTime.UtcNow;
            if ((DateTime.UtcNow - _lastClientSeen.Value).TotalSeconds >= IdleSeconds)
                await StopHotspot();
        }
        catch (Exception ex) { _lastError = ex.GetBaseException().Message; }
    }

    private static async Task Reply(HttpListenerResponse response, object value, int code = 200)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value));
        response.StatusCode = code;
        response.ContentType = "application/json; charset=utf-8";
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes);
        response.Close();
    }

    private static string ReadOrCreate(string path, int bytes, bool password = false)
    {
        Directory.CreateDirectory(DataDir);
        if (File.Exists(path)) return File.ReadAllText(path).Trim();
        var buffer = RandomNumberGenerator.GetBytes(bytes);
        var value = password
            ? Convert.ToBase64String(buffer).Replace("+", "A").Replace("/", "b").Replace("=", "9")[..20]
            : Convert.ToBase64String(buffer);
        File.WriteAllText(path, value, Encoding.ASCII);
        return value;
    }
}