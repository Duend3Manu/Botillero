# push_update.ps1 - Subir cambios a GitHub con número de actualización incremental

# Ruta al archivo que almacena el contador de actualizaciones
$counterFile = Join-Path -Path $PSScriptRoot -ChildPath ".push_counter"

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

# Enviar al remoto configurado (upstream)
git push
