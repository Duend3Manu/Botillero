import subprocess
import requests
import json

def ejecutar(comando):
    # Capturamos la salida para poder enviarla si hay un error
    resultado = subprocess.run(comando, shell=True, text=True, capture_output=True)
    if resultado.returncode != 0:
        print(f"❌ Error ejecutando: {comando}")
        print(f"Stderr: {resultado.stderr}")
        # Notificar del error
        notificar_api(f"🚨 ¡Error en el script de actualización!\n\nComando: `{comando}`\n\nError: ```{resultado.stderr}```")
    else:
        print(f"stdout: {resultado.stdout}")

    return resultado.returncode == 0

print("🔥 Reiniciando proyecto con protección a bibliotecas sagradas...")

# 1. Stash temporal de todo lo actual
print("📦 Guardando todo en stash (por si luego hay arrepentimientos)...")
ejecutar("git stash save --include-untracked 'AutoStash antes del reset brutal'")

# 2. Hard reset al contenido de GitHub
print("🔁 Aplicando hard reset desde GitHub...")
ejecutar("git fetch origin")
ejecutar("git reset --hard origin/main")

# 3. Limpieza selectiva — se conservan tus reliquias
print("🧼 Limpiando lo ignorado... excepto tus carpetas importantes.")
ejecutar(
    "git clean -fdx "
    "-e node_modules/ "
    "-e .wwebjs_auth/ "
    "-e .wwebjs_auth/session "
    "-e .wwebjs_cache/"
    "-e .env"
)

mensaje_final = "✅ Proyecto renovado, bibliotecas intactas, sesión protegida 🐾✨"
print(mensaje_final)

# 4. Notificar al bot de WhatsApp a través de la API
def notificar_api(mensaje):
    url = "http://localhost:3001/send-notification"
    headers = {"Content-Type": "application/json"}
    payload = {"message": mensaje}
    try:
        requests.post(url, headers=headers, data=json.dumps(payload))
        print("📢 Notificación enviada a la API del bot.")
    except requests.exceptions.RequestException as e:
        print(f"❌ No se pudo conectar con la API del bot en {url}. ¿Está corriendo? Error: {e}")

notificar_api(mensaje_final)
