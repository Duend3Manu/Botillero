import os
import subprocess

def limpiar_bloqueo():
    """Si existe un archivo de bloqueo, lo elimina para evitar errores."""
    lock_path = '.git/index.lock'
    if os.path.exists(lock_path):
        print("⚠️  Eliminando archivo '.git/index.lock' para desbloquear el repositorio.")
        os.remove(lock_path)

def es_repo_git():
    """Verifica si el directorio actual es un repositorio de Git."""
    return os.path.exists(".git")

def remoto_configurado():
    """Verifica si el remoto 'origin' está configurado."""
    try:
        remotos = subprocess.check_output(["git", "remote"]).decode()
        return "origin" in remotos
    except subprocess.CalledProcessError:
        return False

def obtener_rama_actual():
    """Obtiene el nombre de la rama actual."""
    try:
        return subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()
    except subprocess.CalledProcessError:
        return None

def verificar_cambios_locales():
    """Comprueba si hay cambios locales sin confirmar o archivos sin seguimiento."""
    try:
        status = subprocess.check_output(["git", "status", "--porcelain"]).decode().strip()
        return status != ""
    except subprocess.CalledProcessError:
        return True

def ejecutar_comando(comando):
    """Ejecuta un comando en la terminal y muestra su progreso."""
    print(f"🔧 Ejecutando: {' '.join(comando)}")
    resultado = subprocess.run(comando, capture_output=True, text=True)
    if resultado.returncode != 0:
        print(f"❌ Error al ejecutar el comando. Mensaje: {resultado.stderr}")
        return False
    print("✅ ¡Hecho!")
    return True

def main():
    """Función principal del script de actualización."""
    print("🚀 Iniciando Actualizador de Repositorio...\n")
    
    if not es_repo_git():
        print("❌ Esta carpeta no es un repositorio Git. No se puede continuar.")
        return

    limpiar_bloqueo()

    if not remoto_configurado():
        print("❌ No se encontró un remoto llamado 'origin'. No se puede saber desde dónde actualizar.")
        return

    rama_actual = obtener_rama_actual()
    if not rama_actual:
        print("❌ No se pudo determinar la rama actual.")
        return
        
    print(f"🔄 Buscando actualizaciones en el servidor (origin/{rama_actual})...")
    if not ejecutar_comando(["git", "fetch", "origin"]):
        return

    if verificar_cambios_locales():
        print("\n⚠️ ¡Atención! Se detectaron cambios locales o archivos no guardados.")
        print("   Si continúas, TODOS tus cambios locales se borrarán permanentemente")
        print("   para que el repositorio quede idéntico al de GitHub.\n")
        
        confirmar = input("👉 ¿Estás seguro de que deseas descartar tus cambios locales y actualizar? (s/n): ").strip().lower()
        if confirmar != "s":
            print("🛑 Actualización cancelada por el usuario.")
            return
    else:
        print("👍 No se encontraron cambios locales. El repositorio está limpio.")

    print(f"\n✨ Sincronizando tu repositorio local con 'origin/{rama_actual}'...")

    if not ejecutar_comando(["git", "reset", "--hard", f"origin/{rama_actual}"]):
        return

    print("\n🧹 Limpiando archivos y carpetas sin seguimiento (se respetará .gitignore)...")
    # --- ESTA ES LA LÍNEA MODIFICADA ---
    if not ejecutar_comando(["git", "clean", "-df"]): # Se quitó la 'x'
        return

    print("\n🎉 ¡Listo! Tu repositorio está completamente actualizado.")
    print("🛡️ Tu carpeta 📂/node_modules se ha mantenido intacta.")

if __name__ == "__main__":
    main()