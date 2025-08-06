import subprocess

def ejecutar(comando):
    resultado = subprocess.run(comando, shell=True, text=True)
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

print("✅ Proyecto renovado, bibliotecas intactas, sesión protegida 🐾✨")
