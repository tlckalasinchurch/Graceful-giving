<#
.SYNOPSIS
    Universal AI Skills Rollback & Uninstaller Script.
.DESCRIPTION
    Safely removes target installed skills or rollbacks configuration without deleting
    shared dependencies, project data, or unrelated user skills.
#>

[CmdletBinding()]
param(
    [switch]$RollbackRulesOnly,
    [switch]$UninstallAllInstalledSkills,
    [string[]]$SkillsToRemove
)

$ErrorActionPreference = "Continue"

$userProfile = $env:USERPROFILE
$agentsSkillsDir = Join-Path $userProfile ".agents\skills"
$claudeSkillsDir = Join-Path $userProfile ".claude\skills"
$geminiSkillsDir = Join-Path $userProfile ".gemini\config\skills"

Write-Host "`n=== Universal AI Skills Rollback & Uninstaller ===" -ForegroundColor Cyan

# 1. Rules Rollback
if ($RollbackRulesOnly -or $UninstallAllInstalledSkills) {
    Write-Host "`nRolling back Anti-AI-Slop rules..." -ForegroundColor Yellow
    $geminiRule = Join-Path $userProfile ".gemini\config\rules\anti-ai-slop-enforcement.md"
    if (Test-Path $geminiRule) {
        Remove-Item $geminiRule -Force
        Write-Host "Removed $geminiRule" -ForegroundColor Green
    }

    $agentsRule = Join-Path $userProfile ".agents\rules\anti-ai-slop-enforcement.md"
    if (Test-Path $agentsRule) {
        Remove-Item $agentsRule -Force
        Write-Host "Removed $agentsRule" -ForegroundColor Green
    }

    # Restore Claude Code backup if available
    $claudeBackups = Get-ChildItem -Path "$userProfile\.claude" -Filter "CLAUDE.md.bak_*" | Sort-Object LastWriteTime -Descending
    if ($claudeBackups.Count -gt 0) {
        $latestBackup = $claudeBackups[0].FullName
        Copy-Item $latestBackup "$userProfile\.claude\CLAUDE.md" -Force
        Write-Host "Restored Claude configuration from backup: $latestBackup" -ForegroundColor Green
    }
}

# 2. Targeted Skills Uninstallation
$targets = @(
    "karpathy-guidelines",
    "design-taste-frontend",
    "anti-ai-slop",
    "ponytail", "ponytail-audit", "ponytail-debt", "ponytail-gain", "ponytail-help", "ponytail-review",
    "caveman", "cavecrew", "caveman-commit", "caveman-compress", "caveman-discover", "caveman-evidence-review", "caveman-explore", "caveman-help", "caveman-learn", "caveman-manage", "caveman-optimize", "caveman-review", "caveman-setup", "caveman-stats", "investigate-first", "lean-build", "megacave", "migration", "safe-refactor", "surgical-patch", "ultracave", "verify-and-stop"
)

if ($SkillsToRemove) {
    $targets = $SkillsToRemove
}

if ($UninstallAllInstalledSkills -or $SkillsToRemove) {
    Write-Host "`nRemoving specified skills from global directories..." -ForegroundColor Yellow
    foreach ($s in $targets) {
        # Call official skills CLI uninstaller
        cmd /c "npx -y skills remove $s -g -y" 2>$null | Out-Null
        
        # Remove junction in gemini config if present
        $geminiJunc = Join-Path $geminiSkillsDir $s
        if (Test-Path $geminiJunc) {
            Remove-Item $geminiJunc -Force -Recurse -ErrorAction SilentlyContinue
        }
        Write-Host "Uninstalled skill: $s" -ForegroundColor Green
    }
}

Write-Host "`nRollback / Uninstall process completed." -ForegroundColor Cyan
