import os
import subprocess

print("🚀 Script 'subir_a_github.py' iniciado...\n")

# � Define la ruta de git (para Windows)
GIT = r"C:\Program Files\Git\bin\git.exe"

# 🔐 Limpia index.lock si existe
lock_path = '.git/index.lock'
if os.path.exists(lock_path):
    print("⚠️ Repositorio bloqueado por index.lock. Eliminando...")
    os.remove(lock_path)
    print("✅ Bloqueo eliminado.\n")

# 🧭 Verifica si el remoto 'origin' está configurado
try:
    remotes = subprocess.check_output([GIT, "remote"]).decode()
except subprocess.CalledProcessError:
    print("❌ Error al verificar remotos. ¿Estás en un repo Git?\n")
    exit()

if "origin" not in remotes:
    print("❌ No encontré un remoto llamado 'origin'. Agregalo con:")
    print("   git remote add origin https://github.com/Duend3Manu/Botillero\n")
    exit()

# 🧹 Limpia archivos ignorados que estén siendo trackeados
def limpiar_archivos_ignorados():
    try:
        ignorados = subprocess.check_output([GIT, "ls-files", "-i", "-o", "--exclude-standard"]).decode().splitlines()
        for archivo in ignorados:
            subprocess.run([GIT, "rm", "--cached", archivo])
            print(f"🧹 Removido del índice: {archivo}")
    except subprocess.CalledProcessError:
        print("⚠️ No se pudo limpiar archivos ignorados.\n")

limpiar_archivos_ignorados()

# 📦 Agrega todos los archivos
try:
    subprocess.run([GIT, "add", "--all"], check=True)
except subprocess.CalledProcessError:
    print("❌ Error al agregar archivos. Revisa si hay archivos bloqueados o con permisos restringidos.\n")
    exit()

# 🧾 Revisa si hay algo para comitear
try:
    status_output = subprocess.check_output([GIT, "status"]).decode()
except subprocess.CalledProcessError:
    print("❌ Error al obtener el estado del repo.\n")
    exit()

if "Changes to be committed" not in status_output:
    print("⚠️ No hay cambios para comitear. Nada que subir.\n")
    exit()

# 📋 Muestra resumen de cambios detectados
print("📋 Cambios detectados:")
for line in status_output.splitlines():
    if line.strip().startswith("new file:") or line.strip().startswith("modified:"):
        print("  -", line.strip())
print("")

# 🧠 Detecta conflictos previos antes de ejecutar push
def conflicto_detectado():
    resultado = subprocess.check_output([GIT, "status"]).decode()
    return "Unmerged paths" in resultado or "CONFLICT" in resultado

if conflicto_detectado():
    print("⚠️ Se detectaron conflictos en tu repo.")
    print("👉 Tipos posibles: archivos duplicados, binarios cruzados, cambios simultáneos.")
    print("🛠️ Soluciones recomendadas:")
    print("   - git restore --staged <archivo>")
    print("   - git rebase --abort   ← para cancelar y volver al estado anterior")
    print("   - git reset --hard origin/main ← si querés reemplazar todo por lo remoto\n")
    exit()

# (Eliminada la definición duplicada de limpiar_archivos_ignorados)


# ✍️ Mensaje de commit
commit_message = input("📝 Escribí el mensaje del commit: ").strip()
if not commit_message:
    commit_message = "actualización sin descripción"
    print("⚠️ Usando mensaje por defecto.\n")

# ⛓️ Ejecuta comandos git (commit, pull --rebase, push)
commands = [
    [GIT, "commit", "-m", commit_message],
    [GIT, "pull", "origin", "main", "--rebase"],
    [GIT, "push", "origin", "main"]
]

for cmd in commands:
    print(f"🔧 Ejecutando: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("❌ Falló este paso. Revisión necesaria.")
        print("🔎 Podés revisar con: git status, git log, o git diff\n")
        break

print("\n🎉 ¡Listo, Manu! Tu bot está subido a GitHub con ❤️ desde Botillero.\n")
