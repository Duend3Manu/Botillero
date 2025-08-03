import subprocess

def ejecutar(comando):
    resultado = subprocess.run(comando, shell=True, text=True)
    return resultado.returncode == 0

print("🔥 Preparando limpieza total del proyecto local...")

# 1. Stash temporal por si te arrepentís
print("📦 Guardando estado actual en stash (por si las moscas)...")
ejecutar("git stash save --include-untracked 'AutoStash antes de destrucción'")

# 2. Forzar pull desde origin
print("🔁 Haciendo hard reset con contenido de GitHub...")
ejecutar("git fetch origin")
ejecutar("git reset --hard origin/main")

# 3. Limpieza extra (opcional)
print("🧼 Limpiando archivos ignorados...")
ejecutar("git clean -fdx")

print("✅ Todo reemplazado sin drama, como en un domingo sin política.")
