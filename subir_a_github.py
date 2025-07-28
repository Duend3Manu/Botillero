import os
import subprocess

print("🚀 Script 'subir_a_github_v3.py' iniciado...\n")

# 🔐 Limpia index.lock si existe
lock_path = '.git/index.lock'
if os.path.exists(lock_path):
    print("⚠️ Repositorio bloqueado por index.lock. Eliminando...")
    os.remove(lock_path)
    print("✅ Bloqueo eliminado.\n")

# 🧭 Verifica si el remoto 'origin' está configurado
remotes = subprocess.check_output("git remote", shell=True).decode()
if "origin" not in remotes:
    print("❌ No encontré un remoto llamado 'origin'. Agregalo con:")
    print("   git remote add origin https://github.com/Duend3Manu/Botillero.git\n")
    exit()

# 📦 Agrega todos los archivos
subprocess.run("git add --all", shell=True)

# 🧾 Revisa si hay algo para comitear
status_output = subprocess.check_output("git status", shell=True).decode()
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
    resultado = subprocess.check_output("git status", shell=True).decode()
    return "Unmerged paths" in resultado or "CONFLICT" in resultado

if conflicto_detectado():
    print("⚠️ Se detectaron conflictos en tu repo.")
    print("👉 Tipos posibles: archivos duplicados, binarios cruzados, cambios simultáneos.")
    print("🛠️ Soluciones recomendadas:")
    print("   - git restore --staged <archivo>")
    print("   - git rebase --abort   ← para cancelar y volver al estado anterior")
    print("   - git reset --hard origin/main ← si querés reemplazar todo por lo remoto\n")
    exit()

# ✍️ Mensaje de commit
commit_message = input("📝 Escribí el mensaje del commit: ").strip()
if not commit_message:
    commit_message = "actualización sin descripción"
    print("⚠️ Usando mensaje por defecto.\n")

# ⛓️ Ejecuta comandos git (commit, pull --rebase, push)
commands = [
    f'git commit -m "{commit_message}"',
    "git pull origin main --rebase",
    "git push origin main"
]

for cmd in commands:
    print(f"🔧 Ejecutando: {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print("❌ Falló este paso. Revisión necesaria.")
        print("🔎 Podés revisar con: git status, git log, o git diff\n")
        break

print("\n🎉 ¡Listo, Manu! Tu bot está subido a GitHub con ❤️ desde Botillero.\n")
