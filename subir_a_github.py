import os
import subprocess

def ejecutar_comando(comando):
    resultado = subprocess.run(comando, shell=True)
    if resultado.returncode != 0:
        print(f"❌ Error al ejecutar: {comando}")
    else:
        print(f"✅ Comando ejecutado: {comando}")

# Mensaje de commit
mensaje = input("📝 Escribí el mensaje del commit: ")

# Pull para sincronizar antes de subir
ejecutar_comando("git pull origin main --rebase")

# Agregar todos los cambios
ejecutar_comando("git add .")

# Hacer el commit
ejecutar_comando(f'git commit -m "{mensaje}"')

# Subir al repositorio remoto
ejecutar_comando("git push origin main")
