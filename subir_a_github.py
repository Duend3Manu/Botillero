import os
import subprocess
import sys

print("🚀 Script 'subir_a_github.py' v2.0 iniciado...\n")

# --- FUNCIÓN AUXILIAR PARA EJECUTAR COMANDOS DE FORMA SEGURA ---
def ejecutar_comando(comando, capturar_output=False):
    """Ejecuta un comando del sistema de forma segura sin usar 'shell=True'."""
    try:
        if capturar_output:
            # Usamos text=True para decodificar automáticamente la salida a string
            resultado = subprocess.check_output(comando, text=True, stderr=subprocess.PIPE)
            return resultado.strip()
        else:
            # check=True lanzará una excepción si el comando falla
            subprocess.run(comando, check=True)
            return True
    except FileNotFoundError:
        print(f"❌ Error: El comando '{comando[0]}' no se encuentra. ¿Tenés Git instalado y en el PATH?")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        # Si el comando falla, imprimimos el error y devolvemos None o False
        # El error de git a menudo se imprime en stderr, así que lo mostramos si existe
        if e.stderr:
            print(f"⚠️ Error al ejecutar '{' '.join(comando)}':\n{e.stderr.strip()}")
        return None

# 🔐 Limpia index.lock si existe
lock_path = '.git/index.lock'
if os.path.exists(lock_path):
    print("⚠️ Repositorio bloqueado por index.lock. Eliminando...")
    os.remove(lock_path)
    print("✅ Bloqueo eliminado.\n")

# 🧭 Verifica si el remoto 'origin' está configurado
remotes = ejecutar_comando(["git", "remote"], capturar_output=True)
if remotes is None: # Si falló el comando, el script ya habrá impreso el error.
    sys.exit(1)
if "origin" not in remotes.splitlines():
    print("❌ No encontré un remoto llamado 'origin'. Agregalo con:")
    print("   git remote add origin URL_DE_TU_REPO\n")
    sys.exit()

# --- MEJORA 1: DETECCIÓN DINÁMICA DE LA RAMA ACTUAL ---
# En lugar de usar 'main' siempre, detectamos la rama en la que estás trabajando.
current_branch = ejecutar_comando(["git", "rev-parse", "--abbrev-ref", "HEAD"], capturar_output=True)
if not current_branch:
    print("❌ No se pudo detectar la rama actual.\n")
    sys.exit()
print(f"🌿 Trabajando sobre la rama: '{current_branch}'\n")


# 🧹 Limpia archivos ignorados que estén siendo trackeados
def limpiar_archivos_ignorados():
    ignorados_str = ejecutar_comando(["git", "ls-files", "-i", "--exclude-standard"], capturar_output=True)
    if ignorados_str: # Solo si hay archivos ignorados para limpiar
        for archivo in ignorados_str.splitlines():
            print(f"🧹 Removiendo del índice: {archivo}")
            # --- MEJORA 2: COMANDOS SEGUROS (sin shell=True) ---
            ejecutar_comando(["git", "rm", "--cached", archivo])

limpiar_archivos_ignorados()

# 📦 Agrega todos los archivos
print("📦 Stageando todos los archivos...")
if not ejecutar_comando(["git", "add", "--all"]):
    print("❌ Error al agregar archivos. Revisa si hay archivos bloqueados o con permisos restringidos.\n")
    sys.exit()

# 🧾 Revisa si hay algo para comitear
status_output = ejecutar_comando(["git", "status", "--porcelain"]) # --porcelain es más fácil de parsear
if not status_output:
    print("✅ No hay cambios para comitear. ¡Tu repo está al día!\n")
    sys.exit()

# 📋 Muestra resumen de cambios detectados
print("📋 Cambios detectados:")
status_normal = ejecutar_comando(["git", "status"], capturar_output=True)
for line in status_normal.splitlines():
    if line.strip().startswith("new file:") or line.strip().startswith("modified:"):
        print("   -", line.strip())
print("")

# 🧠 Detecta conflictos previos
if "Unmerged paths" in status_normal or "CONFLICT" in status_normal:
    print("⚠️ ¡CONFLICTO! Se detectaron conflictos sin resolver en tu repo.")
    print("🛠️ Soluciones recomendadas:")
    print("   - Revisa los archivos marcados con '<<<<< HEAD'")
    print("   - git add <archivo_resuelto>  ← para marcarlo como resuelto")
    print("   - git rebase --continue     ← si estabas en medio de un rebase")
    print(f"   - git reset --hard origin/{current_branch} ← ¡CUIDADO! Reemplaza todo con la versión remota\n")
    sys.exit()

# ✍️ Mensaje de commit
commit_message = input("📝 Escribí el mensaje del commit: ").strip()
if not commit_message:
    commit_message = "actualización sin descripción"
    print("⚠️ Usando mensaje por defecto.\n")

# --- MEJORA 3: MANEJO DE ERRORES ESPECÍFICO PARA REBASE ---
# Lista de comandos a ejecutar
commands = [
    ["git", "commit", "-m", commit_message],
    ["git", "pull", "origin", current_branch, "--rebase"],
    ["git", "push", "origin", current_branch]
]

for cmd_list in commands:
    comando_str = ' '.join(cmd_list)
    print(f"🔧 Ejecutando: {comando_str}")
    
    # Reutilizamos la función para ejecutar el comando
    if not ejecutar_comando(cmd_list):
        # Si el comando falló, la función ya imprimió el error de git
        # Ahora damos consejos adicionales si fue el rebase
        if "pull" in cmd_list and "--rebase" in cmd_list:
             print("\n🆘 El 'pull --rebase' falló, probablemente por un conflicto con los cambios remotos.")
             print("   Tu repositorio puede estar en un estado de REBASE pendiente.")
             print("   QUÉ HACER AHORA:")
             print("     1. Abrí los archivos con conflictos y resolvelos.")
             print("     2. Usá 'git add <archivo_resuelto>' para marcarlos.")
             print("     3. Ejecutá 'git rebase --continue' para finalizar.")
             print("   O, si querés cancelar todo, ejecutá 'git rebase --abort'.\n")
        else:
            print("🔎 Podés revisar el estado con: git status, git log, o git diff\n")
        
        # Detenemos el script si un paso falla
        break
else:
    # Este bloque 'else' solo se ejecuta si el bucle 'for' termina sin un 'break'
    print("\n🎉 ¡Listo, Manu! Tu bot está subido a GitHub con ❤️ desde Botillero.\n")