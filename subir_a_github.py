import os
import subprocess

# Mensaje simpático al comenzar
print("🚀 ¡Activando script para subir a GitHub!")

# 🛡️ Verificar y eliminar el index.lock si existe
lock_path = '.git/index.lock'
if os.path.exists(lock_path):
    print("⚠️ Repositorio bloqueado por index.lock. Eliminando...")
    os.remove(lock_path)
    print("✅ Bloqueo eliminado. Listo para trabajar.")

# 📝 Pedir mensaje de commit
commit_message = input("Escribí el mensaje del commit: ").strip()
if not commit_message:
    print("⚠️ No escribiste mensaje de commit. Usando 'actualización sin descripción'.")
    commit_message = "actualización sin descripción"

# ✅ Ejecutar comandos Git
commands = [
    "git add .",
    f'git commit -m "{commit_message}"',
    "git pull origin main --rebase",
    "git push origin main"
]

for cmd in commands:
    print(f"\n🔧 Ejecutando: {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print("❌ Hubo un problema con este comando. Revisión necesaria.")
        break
# Agrega todos los archivos, incluyendo untracked
subprocess.run("git add --all", shell=True)

print("\n🎉 ¡Todo listo! Tu proyecto está en GitHub.")
