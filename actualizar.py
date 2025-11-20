import subprocess
import sys

# Configuración
RAMA_PRINCIPAL = "origin/main"

def ejecutar_comando(comando):
    try:
        resultado = subprocess.run(
            comando, 
            shell=True, 
            check=True, 
            text=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ [ERROR] Falló: {comando}\n   └─ {e.stderr.strip()}")
        return False

def actualizar_proyecto():
    print("\n🛡️  Iniciando actualización segura (Tus archivos locales se respetarán)...")

    # PASO 1: Descargar información de GitHub (sin tocar archivos aún)
    print("1️⃣  Descargando cambios de la nube...")
    if not ejecutar_comando("git fetch --all"):
        return

    # PASO 2: Igualar SOLO los archivos rastreados por Git
    # IMPORTANTE: Este comando NO borra archivos que no estén en GitHub 
    # (como .env o node_modules), simplemente los ignora y los deja vivos.
    print(f"2️⃣  Actualizando código fuente a la versión {RAMA_PRINCIPAL}...")
    if ejecutar_comando(f"git reset --hard {RAMA_PRINCIPAL}"):
        print("\n✅ ¡Listo! El código se actualizó desde GitHub.")
        print("   - Tu '.env' sigue ahí.")
        print("   - Tu 'node_modules' sigue ahí.")
        print("   - Archivos extra locales siguen ahí.")
    else:
        print("⚠️ Algo falló en el reset.")

if __name__ == "__main__":
    actualizar_proyecto()