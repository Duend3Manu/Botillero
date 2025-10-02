import os
import subprocess
import sys
import io

# --- INICIO DE LA SOLUCIÓN ---
# Forzamos a que tanto la salida estándar como la de errores usen siempre UTF-8.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
# --- FIN DE LA SOLUCIÓN ---

def limpiar_bloqueo():
    """Si existe un archivo .git/index.lock, lo elimina."""
    lock_path = '.git/index.lock'
    if os.path.exists(lock_path):
        print("⚠️  Repositorio bloqueado. Eliminando .git/index.lock...")
        os.remove(lock_path)
        print("✅ Bloqueo eliminado.\n")

def obtener_rama_actual():
    """Obtiene el nombre de la rama de Git actual."""
    try:
        # Usamos subprocess.run para consistencia y mejor manejo de errores.
        resultado = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, encoding='utf-8', check=True
        )
        return resultado.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"❌ No se pudo obtener la rama actual. Error: {e.stderr}", file=sys.stderr)
        return None

def ejecutar_comando(comando_lista, descripcion=""):
    """Ejecuta un comando de subprocess de forma segura y verifica el resultado."""
    print(f"🔧 Ejecutando: {descripcion or ' '.join(comando_lista)}")
    resultado = subprocess.run(comando_lista, capture_output=True, text=True, encoding='utf-8')
    
    if resultado.returncode != 0:
        print(f"❌ Falló este paso. Revisión necesaria.")
        print("--- Salida de Error ---")
        print(resultado.stderr)
        print("-----------------------")
        return False
    
    if resultado.stdout:
        print(resultado.stdout.strip())
    return True

def main():
    """Función principal del script."""
    print("🚀 Script 'subir_a_github.py' iniciado...\n")
    
    limpiar_bloqueo()

    if not os.path.exists('.git'):
        print("❌ Esta carpeta no parece ser un repositorio de Git.")
        return

    rama = obtener_rama_actual()
    if not rama:
        return

    print(f"✅ Detectada la rama actual: '{rama}'\n")

    # Verificamos el estado antes de hacer 'add' para ver si hay algo que subir.
    status_result = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, encoding='utf-8')
    if not status_result.stdout.strip():
        print("✅ No hay cambios para comitear. Tu repositorio ya está al día.")
        return

    if not ejecutar_comando(["git", "add", "--all"], descripcion="Añadiendo todos los cambios al staging"):
        return

    print("📋 Cambios detectados:")
    # Reutilizamos el resultado que ya teníamos
    status_short_result = subprocess.run(["git", "status", "-s"], capture_output=True, text=True, encoding='utf-8')
    if status_short_result.stdout:
        print(status_short_result.stdout)

    commit_message = input("📝 Escribe el mensaje del commit: ").strip()
    if not commit_message:
        commit_message = "actualización sin descripción"
        print("⚠️ Usando mensaje por defecto.\n")

    if not ejecutar_comando(["git", "commit", "-m", commit_message], descripcion=f'git commit -m "{commit_message}"'):
        return
        
    if not ejecutar_comando(["git", "pull", "origin", rama, "--rebase"], descripcion=f"git pull origin {rama} --rebase"):
        print("🚨 El 'pull' falló. Puede que tengas un conflicto de merge que debas resolver manualmente.")
        return
        
    if not ejecutar_comando(["git", "push", "origin", rama], descripcion=f"git push origin {rama}"):
        return

    print("\n🎉 ¡Listo, Manu! Tu código está seguro en GitHub.\n")

if __name__ == "__main__":
    main()