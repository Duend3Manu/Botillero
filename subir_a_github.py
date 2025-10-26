import os
import subprocess
import sys

def limpiar_bloqueo():
    """Si existe un archivo de bloqueo de git, lo elimina."""
    lock_path = '.git/index.lock'
    if os.path.exists(lock_path):
        print("⚠️ Eliminando index.lock para desbloquear el repo...")
        try:
            os.remove(lock_path)
        except OSError as e:
            print(f"❌ Error al eliminar el archivo de bloqueo: {e}")
            sys.exit(1)

def ejecutar_comando(comando, capturar_salida=False, verificar=True):
    """Ejecuta un comando de forma segura y devuelve el resultado."""
    print(f"🔧 Ejecutando: {' '.join(comando)}")
    try:
        resultado = subprocess.run(
            comando,
            capture_output=True,
            text=True,
            encoding='utf-8',
            check=verificar  # Lanza una excepción si el comando falla
        )
        if capturar_salida:
            return resultado.stdout.strip()
        if resultado.stderr and not verificar:
             print(f"⚠️ Advertencia: {resultado.stderr.strip()}")
        return True
    except FileNotFoundError:
        print(f"❌ Error: El comando '{comando[0]}' no se encontró. ¿Está Git instalado y en tu PATH?")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ Falló el comando: {' '.join(comando)}")
        print(f"   Salida de error:\n{e.stderr.strip()}")
        return None

def mostrar_cambios():
    """Muestra los archivos modificados, nuevos o eliminados."""
    status_output = ejecutar_comando(["git", "status", "--porcelain"], capturar_salida=True)
    if status_output:
        print("\n📋 Cambios detectados:")
        for line in status_output.splitlines():
            print(f"  - {line.strip()}")
        return True
    return False

def main():
    print("🚀 Iniciando Botillero Uploader...\n")

    if not os.path.exists(".git"):
        print("❌ Esta carpeta no es un repositorio Git.")
        return

    limpiar_bloqueo()

    # Verificar si el remoto 'origin' está configurado
    remotos = ejecutar_comando(["git", "remote"], capturar_salida=True)
    if "origin" not in remotos.splitlines():
        print("❌ No encontré 'origin'. Agregalo con:")
        print("   git remote add origin https://github.com/Duend3Manu/Botillero.git")
        return

    # Comprobar si hay conflictos sin resolver antes de empezar
    status_conflicto = ejecutar_comando(["git", "status"], capturar_salida=True)
    if "Unmerged paths" in status_conflicto or "CONFLICT" in status_conflicto:
        print("❌ Se detectaron conflictos sin resolver. Por favor, resuélvelos primero.")
        print("🛠️ Usá: git status, git add <archivos_resueltos>, y luego `git rebase --continue` o `git commit`.")
        return

    # Mostrar cambios y verificar si hay algo para subir
    if not mostrar_cambios():
        print("✅ No hay cambios para subir. ¡Todo al día!")
        return

    # Añadir todos los cambios
    if not ejecutar_comando(["git", "add", "--all"]):
        return

    # Pedir mensaje de commit
    mensaje = input("\n📝 Escribí el mensaje del commit: ").strip()
    if not mensaje:
        mensaje = "actualización sin descripción"
    print(f"📨 Usando mensaje: '{mensaje}'")

    # Obtener rama actual
    rama = ejecutar_comando(["git", "rev-parse", "--abbrev-ref", "HEAD"], capturar_salida=True)
    if not rama:
        return

    # Confirmar antes de continuar
    confirmar = input(f"🚀 ¿Confirmas el push a la rama '{rama}'? (s/n): ").strip().lower()
    if confirmar != "s":
        print("🛑 Push cancelado por el usuario.")
        return

    # 1. Commit
    if not ejecutar_comando(["git", "commit", "-m", mensaje]):
        print("🛑 El commit falló. Revisa los mensajes de error.")
        return

    # 2. Pull con rebase
    print("\n🔄 Sincronizando con el repositorio remoto...")
    if not ejecutar_comando(["git", "pull", "origin", rama, "--rebase"]):
        print("\n❌ Hubo un conflicto durante el `pull --rebase`.")
        print("   Git ha intentado combinar los cambios remotos con los tuyos, pero hay superposiciones.")
        print("\n   --- ¿Qué hacer ahora? ---")
        print("   1. Abrí los archivos marcados con 'CONFLICT'.")
        print("   2. Editá los archivos para resolver las diferencias (dejá el código que quieras conservar).")
        print("   3. Una vez resueltos, ejecutá `git add .` para marcarlos como solucionados.")
        print("   4. Finalmente, ejecutá `git rebase --continue`.")
        print("   5. Si todo sale bien, volvé a ejecutar este script para hacer el `push` final.")
        print("\n   Si te complicas, podés abortar con `git rebase --abort` para volver al estado anterior.")
        return

    # 3. Push
    print("\n📤 Subiendo cambios a GitHub...")
    if ejecutar_comando(["git", "push", "origin", rama]):
        print("\n🎉 ¡Listo, Manu! Tu bot está en GitHub y sigue creciendo con sabor a código casero.\n")

if __name__ == "__main__":
    main()
