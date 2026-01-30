# push_update.ps1 - Subir cambios a GitHub con número de actualización incremental y sincronizar con remoto

# Ruta al archivo que almacena el contador de actualizaciones
$counterFile = Join-Path -Path $PSScriptRoot -ChildPath ".push_counter"

# 1. MEJORA: Verificar si hay cambios reales antes de intentar actualizar
$gitStatus = git status --porcelain
if (-not $gitStatus) {
    Write-Warning "⚠️ No hay cambios pendientes para subir. Todo está actualizado."
    exit
}

# Leer el contador actual o iniciar en 0 si no existe
if (Test-Path $counterFile) {
    $counter = [int](Get-Content $counterFile)
}
else {
    $counter = 0
}
$counter++

# Guardar el nuevo valor del contador
$counter | Set-Content -Path $counterFile -Encoding ASCII

# Añadir todos los cambios (git respeta .gitignore)
git add .

# Crear el mensaje de commit
$commitMessage = "actualizacion numero $counter"

git commit -m $commitMessage

# Sincronizar con el remoto antes de hacer push
Write-Host "Sincronizando con el remoto..."
# Intentar pull con rebase para mantener historial lineal
git pull --rebase
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al hacer git pull --rebase. Revise los conflictos manualmente antes de volver a ejecutar el script."
    exit $LASTEXITCODE
}

# Enviar al remoto configurado (upstream)
Write-Host "Realizando push..."
git push
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error al hacer git push. Revise el mensaje anterior para más detalles."
    exit $LASTEXITCODE
}

Write-Host "✅ Actualización #$counter completada exitosamente."
