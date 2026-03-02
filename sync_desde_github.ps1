# sync_desde_github.ps1 - Sincronizar con GitHub de forma inteligente
# Este script compara los archivos locales con GitHub y actualiza solo si GitHub tiene versiones mas recientes

Write-Host "[SYNC] Sincronizando con GitHub..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que estamos en un repositorio Git
if (-not (Test-Path ".git")) {
    Write-Error "[ERROR] Este directorio no es un repositorio Git. Ejecuta 'git init' primero."
    exit 1
}

# 2. Verificar que el remoto 'origin' existe
$remotes = git remote
if ($remotes -notcontains "origin") {
    Write-Error "[ERROR] No se encontro el remoto 'origin'. Configuralo con:"
    Write-Host "   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git" -ForegroundColor Yellow
    exit 1
}

# 3. Guardar cambios locales en stash (por seguridad)
Write-Host "[STASH] Guardando cambios locales temporalmente..." -ForegroundColor Yellow
$stashOutput = git stash push -m "Sync temporal - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$hasStash = $stashOutput -notlike "*No local changes to save*"

if ($hasStash) {
    Write-Host "   [OK] Cambios guardados en stash" -ForegroundColor Green
} else {
    Write-Host "   [INFO] No hay cambios locales para guardar" -ForegroundColor Gray
}

# 4. Obtener ultimos cambios del remoto
Write-Host ""
Write-Host "[FETCH] Descargando ultimos cambios desde GitHub..." -ForegroundColor Yellow
git fetch origin

if ($LASTEXITCODE -ne 0) {
    Write-Error "[ERROR] Error al hacer fetch desde GitHub"
    if ($hasStash) {
        Write-Host "[RESTORE] Restaurando cambios locales..." -ForegroundColor Yellow
        git stash pop
    }
    exit 1
}

# 5. Comparar commits locales vs remotos
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main

if ($localCommit -eq $remoteCommit) {
    Write-Host ""
    Write-Host "[OK] Tu repositorio local ya esta actualizado" -ForegroundColor Green
    Write-Host "   Commit actual: $($localCommit.Substring(0,7))" -ForegroundColor Gray
    
    if ($hasStash) {
        Write-Host ""
        Write-Host "[RESTORE] Restaurando tus cambios locales..." -ForegroundColor Yellow
        git stash pop
    }
    exit 0
}

# 6. Verificar si GitHub tiene commits mas recientes
Write-Host ""
Write-Host "[COMPARE] Comparando versiones..." -ForegroundColor Cyan

$behind = git rev-list --count HEAD..origin/main
$ahead = git rev-list --count origin/main..HEAD

if ($behind -gt 0) {
    Write-Host "   Commits en GitHub que no tienes: $behind" -ForegroundColor Yellow
} else {
    Write-Host "   Commits en GitHub que no tienes: $behind" -ForegroundColor Gray
}

if ($ahead -gt 0) {
    Write-Host "   Commits tuyos que GitHub no tiene: $ahead" -ForegroundColor Yellow
} else {
    Write-Host "   Commits tuyos que GitHub no tiene: $ahead" -ForegroundColor Gray
}

# 7. Decidir que hacer segun el estado
if ($behind -gt 0 -and $ahead -eq 0) {
    # Solo necesitamos actualizar (GitHub esta adelante)
    Write-Host ""
    Write-Host "[UPDATE] GitHub tiene cambios mas recientes. Actualizando..." -ForegroundColor Green
    
    git merge origin/main --ff-only
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Actualizacion completada exitosamente" -ForegroundColor Green
    } else {
        Write-Error "[ERROR] Error al actualizar. Puede haber conflictos."
        if ($hasStash) {
            Write-Host "[RESTORE] Restaurando cambios locales..." -ForegroundColor Yellow
            git stash pop
        }
        exit 1
    }
    
} elseif ($behind -eq 0 -and $ahead -gt 0) {
    # Nosotros estamos adelante (GitHub necesita nuestros cambios)
    Write-Host ""
    Write-Host "[INFO] Tu version local esta mas adelante que GitHub" -ForegroundColor Yellow
    Write-Host "   [TIP] Usa './push_update.ps1' para subir tus cambios" -ForegroundColor Cyan
    
} elseif ($behind -gt 0 -and $ahead -gt 0) {
    # Divergencia - ambos tienen cambios diferentes
    Write-Host ""
    Write-Host "[DIVERGED] Las versiones han divergido. Necesitas hacer merge o rebase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "  1. Merge automatico (combinar cambios):" -ForegroundColor White
    Write-Host "     git merge origin/main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Rebase (aplicar tus cambios sobre los de GitHub):" -ForegroundColor White
    Write-Host "     git rebase origin/main" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Sobrescribir todo con GitHub (perder cambios locales):" -ForegroundColor White
    Write-Host "     git reset --hard origin/main" -ForegroundColor Gray
    Write-Host ""
    
    $userChoice = Read-Host "Que quieres hacer? (1/2/3) o Enter para cancelar"
    
    switch ($userChoice) {
        "1" {
            Write-Host ""
            Write-Host "[MERGE] Haciendo merge..." -ForegroundColor Yellow
            git merge origin/main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Merge completado" -ForegroundColor Green
            } else {
                Write-Error "[ERROR] Hay conflictos que resolver manualmente"
                Write-Host "   Usa 'git status' para ver los archivos en conflicto" -ForegroundColor Yellow
            }
        }
        "2" {
            Write-Host ""
            Write-Host "[REBASE] Haciendo rebase..." -ForegroundColor Yellow
            git rebase origin/main
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Rebase completado" -ForegroundColor Green
            } else {
                Write-Error "[ERROR] Hay conflictos que resolver manualmente"
                Write-Host "   Usa 'git status' para ver los archivos en conflicto" -ForegroundColor Yellow
                Write-Host "   Usa 'git rebase --abort' para cancelar el rebase" -ForegroundColor Yellow
            }
        }
        "3" {
            Write-Host ""
            Write-Warning "[WARNING] ADVERTENCIA: Perderas todos tus cambios locales"
            $confirm = Read-Host "Estas seguro? (si/no)"
            
            if ($confirm -eq "si") {
                git reset --hard origin/main
                Write-Host "[OK] Repositorio sincronizado con GitHub (cambios locales eliminados)" -ForegroundColor Green
            } else {
                Write-Host "[CANCEL] Cancelado" -ForegroundColor Yellow
            }
        }
        default {
            Write-Host "[CANCEL] Operacion cancelada" -ForegroundColor Yellow
        }
    }
}

# 8. Restaurar cambios guardados en stash si existen
if ($hasStash) {
    Write-Host ""
    Write-Host "[RESTORE] Restaurando tus cambios locales..." -ForegroundColor Yellow
    
    git stash pop
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Cambios restaurados" -ForegroundColor Green
    } else {
        Write-Warning "[WARNING] Hay conflictos al restaurar tus cambios"
        Write-Host "   Tus cambios estan guardados en 'git stash list'" -ForegroundColor Yellow
        Write-Host "   Usa 'git stash show' para verlos" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[DONE] Sincronizacion completada" -ForegroundColor Cyan
