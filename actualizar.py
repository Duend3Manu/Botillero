import subprocess
import sys
import os
import shutil

def limpiar_bloqueo():
    """Si existe un archivo de bloqueo de git, lo elimina."""
    lock_path = '.git/index.lock'
    if os.path.exists(lock_path):
        print("⚠️ Se encontró un archivo de bloqueo '.git/index.lock'. Eliminándolo...")
        try:
            os.remove(lock_path)
        except OSError as e:
            print(f"❌ Error al eliminar el archivo de bloqueo: {e}")

print("🔥 Reiniciando proyecto con protección a bibliotecas sagradas...")
print("⚠️ Asegúrate de que el proceso del bot (node) esté detenido antes de continuar.")

# Verificación de .gitignore para messages.db
gitignore_path = ".gitignore"
db_file = "messages.db"

# 1. MEJORA: Backup de seguridad de la base de datos antes de cualquier operación destructiva
if os.path.exists(db_file):
    print(f"🛡️ Creando respaldo de seguridad: {db_file}.bak ...")
    shutil.copy2(db_file, f"{db_file}.bak")

# 2. MEJORA: Agregar automáticamente al .gitignore en lugar de solo avisar
if os.path.exists(gitignore_path):
    with open(gitignore_path, "r") as f:
        ignored_files = f.read().splitlines()
    if db_file not in ignored_files and f"/{db_file}" not in ignored_files:
        print(f"📝 Agregando '{db_file}' a .gitignore para protección futura...")
        with open(gitignore_path, "a") as f:
            f.write(f"\n{db_file}")
else:
    print("🤷 No se encontró .gitignore. Creándolo...")
    with open(gitignore_path, "w") as f:
        f.write(f"{db_file}\nnode_modules/\n.env\n.wwebjs_auth/\n")

def ejecutar(comando, verificar=True):
    """Ejecuta un comando de forma segura y devuelve si tuvo éxito."""
    print(f"🔧 Ejecutando: {' '.join(comando)}")
    try:
        resultado = subprocess.run(
            comando,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace', # Evita crashes si la consola de Windows usa caracteres raros
            check=verificar
        )
        if resultado.stdout.strip():
            print(f"   ✅ {resultado.stdout.strip()}")
        return True
    except FileNotFoundError:
        print(f"❌ Error: El comando '{comando[0]}' no se encontró. ¿Está Git instalado y en tu PATH?")
        return False
    except subprocess.CalledProcessError as e:
        error_msg = f"❌ Falló el comando: {' '.join(comando)}\n   Error: {e.stderr.strip()}"
        print(error_msg)
        return False

limpiar_bloqueo()

# Verificar si el remoto 'origin' está configurado
remotos_check = subprocess.run(["git", "remote"], capture_output=True, text=True)
if "origin" not in remotos_check.stdout.splitlines():
    print("❌ No se encontró el remoto 'origin'. Por favor, configúralo con:")
    print("   git remote add origin https://github.com/Duend3Manu/Botillero.git")
    sys.exit(1)

# Si messages.db está siendo rastreado por Git, lo eliminamos del seguimiento.
is_tracked_check = subprocess.run(["git", "ls-files", "--error-unmatch", db_file], capture_output=True)
if is_tracked_check.returncode == 0:
    print(f"☝️ El archivo '{db_file}' está siendo rastreado por Git. Se eliminará del seguimiento (el archivo físico no se borrará).")
    if not ejecutar(["git", "rm", "--cached", db_file]):
        sys.exit(1)
    # Es buena práctica hacer un commit de este cambio para que no vuelva a pasar
    ejecutar(["git", "commit", "-m", f"chore: Dejar de rastrear {db_file}"], verificar=False) # No verificar por si no hay nada que commitear

# 1. Stash temporal de todo lo actual
print("📦 Guardando todo en stash (por si luego hay arrepentimientos)...")
if not ejecutar(["git", "stash", "save", "--include-untracked", "AutoStash antes del reset brutal"]):
    sys.exit(1)

# 2. Hard reset al contenido de GitHub
print("🔁 Aplicando hard reset desde GitHub...")
if not ejecutar(["git", "fetch", "origin"]) or not ejecutar(["git", "reset", "--hard", "origin/main"]):
    sys.exit(1)

# 3. Limpieza selectiva — se conservan tus reliquias
print("🧼 Limpiando lo ignorado... excepto tus carpetas importantes.")
ejecutar(["git", "clean", "-fdx", "-e", "node_modules/", "-e", ".wwebjs_auth/", "-e", ".env", "-e", "messages.db"])

mensaje_final = "✅ Proyecto renovado, bibliotecas intactas, sesión protegida 🐾✨"
print(mensaje_final)
