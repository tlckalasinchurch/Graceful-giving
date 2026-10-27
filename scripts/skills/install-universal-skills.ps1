<#
.SYNOPSIS
    Universal AI Skills Installer for Windows AI Coding Agents.
.DESCRIPTION
    Installs and links universal AI skills across Antigravity, Claude Code, Codex, OpenCode,
    and all supported agent environments using the official skills CLI.
    Includes idempotency, error handling, logging, and configuration safety.
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$SkipAntigravityLink
)

$ErrorActionPreference = "Stop"

$LogFile = "$env:TEMP\install-universal-skills-$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
function Log-Info($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [INFO] $msg"
    Write-Host $line -ForegroundColor Cyan
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}
function Log-Success($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [SUCCESS] $msg"
    Write-Host $line -ForegroundColor Green
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}
function Log-Warn($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [WARN] $msg"
    Write-Host $line -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}
function Log-Err($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [ERROR] $msg"
    Write-Host $line -ForegroundColor Red
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

Log-Info "Starting Universal AI Skills Installation. Log: $LogFile"

# 1. Environment Prerequisite Check
Log-Info "Checking prerequisites (Node.js, Git, uv/python)..."
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is required but not found in PATH."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is required but not found in PATH."
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "npx is required but not found in PATH."
}
Log-Success "Prerequisites verified: Git $(git --version), Node $(node --version)"

# 2. Target Repositories to Install
$repositories = @(
    @{ Name = "Karpathy Skills"; Repo = "forrestchang/andrej-karpathy-skills" },
    @{ Name = "Superpowers"; Repo = "obra/superpowers" },
    @{ Name = "Matt Pocock Skills"; Repo = "mattpocock/skills" },
    @{ Name = "Anthropic Skills"; Repo = "anthropics/skills" },
    @{ Name = "Ponytail"; Repo = "DietrichGebert/ponytail" },
    @{ Name = "Graphify"; Repo = "Graphify-Labs/graphify" },
    @{ Name = "Caveman"; Repo = "JuliusBrussee/caveman" },
    @{ Name = "Agent Skills"; Repo = "addyosmani/agent-skills" },
    @{ Name = "Taste Skill"; Repo = "Leonxlnx/taste-skill" },
    @{ Name = "Anti-AI-Slop"; Repo = "Krirox/anti-ai-slop-skills" }
)

# 3. Global Installation via skills CLI
foreach ($pkg in $repositories) {
    Log-Info "Installing $($pkg.Name) from $($pkg.Repo) to all agents globally..."
    try {
        $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx -y skills add $($pkg.Repo) -g --agent * --copy -y" -NoNewWindow -PassThru -Wait
        if ($proc.ExitCode -eq 0) {
            Log-Success "Successfully processed $($pkg.Name)"
        } else {
            Log-Warn "$($pkg.Name) exited with code $($proc.ExitCode). Check log for details."
        }
    } catch {
        Log-Err "Failed to execute installer for $($pkg.Name): $_"
    }
}

# 4. Check/Install Graphify CLI
Log-Info "Verifying Graphify CLI..."
if (-not (Get-Command graphify -ErrorAction SilentlyContinue)) {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Log-Info "Installing Graphify CLI via uv tool install graphifyy..."
        uv tool install graphifyy
    } else {
        Log-Warn "uv not found; skipping automatic Graphify CLI installation."
    }
} else {
    Log-Success "Graphify CLI is already available: $(graphify --version)"
}

# 5. Link to Antigravity Global Discovery (~/.gemini/config/skills)
if (-not $SkipAntigravityLink) {
    $agentsDir = "$env:USERPROFILE\.agents\skills"
    $geminiDir = "$env:USERPROFILE\.gemini\config\skills"
    if (-not (Test-Path $geminiDir)) {
        New-Item -ItemType Directory -Path $geminiDir -Force | Out-Null
    }

    Log-Info "Syncing/Junctioning skills into Antigravity global directory: $geminiDir"
    $items = Get-ChildItem -Path $agentsDir -Directory -ErrorAction SilentlyContinue
    $linkedCount = 0
    foreach ($item in $items) {
        $dest = Join-Path $geminiDir $item.Name
        if (-not (Test-Path $dest)) {
            try {
                New-Item -ItemType Junction -Path $dest -Target $item.FullName | Out-Null
                $linkedCount++
            } catch {
                Log-Warn "Could not create junction for $($item.Name): $_"
            }
        }
    }
    Log-Success "Linked $linkedCount new skills into Antigravity discovery path (Total: $((Get-ChildItem -Path $geminiDir).Count))"
}

# 6. Apply Anti-AI-Slop Global Rule
Log-Info "Applying Anti-AI-Slop and UI/UX Design Standards rules..."
$ruleContent = @"
---
trigger: model_decision
description: Enforce Anti-AI-Slop, Taste, and Frontend Design standards for any UI/UX or frontend code.
---

# Anti-AI-Slop & UI/UX Design Standards

Enforce Taste Skill (`design-taste-frontend`), Anti-AI-Slop (`anti-ai-slop`), and Frontend Design (`frontend-design`) specifically when working on UI/UX, frontend, styling, layout, or visual design tasks.

## Quality Criteria & Guardrails:
1. **Avoid Template/Generic Aesthetics**: Eliminate cookie-cutter "modern SaaS" AI slop, default generic prompts, and soulless layouts. Every UI must feel authentic, intentional, and tailored to the product, user, and domain context.
2. **Context & Existing Design System**: Inspect the existing design system, design tokens, and components before touching any code. For projects with an established design system, strictly preserve existing typography, color tokens, spacing scale, component patterns, and interaction models. Never invent an arbitrary visual theme or unapproved tokens.
3. **Restraint Over Decoration**: Eliminate unmotivated gradients, gratuitous glassmorphism, heavy drop shadows, excessive nested cards, and decorative animations lacking clear UX rationale.
4. **Clear Visual Hierarchy & Purposeful Layout**: Use strong layout hierarchy, intentional typography contrast, whitespace discipline, and readable content structures.
5. **Multi-device Responsiveness & Accessibility (a11y)**: Ensure robust responsive behavior across mobile, tablet, and desktop viewports, with WCAG compliance (contrast ratios, keyboard focus states, aria labels).
6. **Exhaustive State Handling**: Always design and verify loading, empty, error, partial, success, and disabled states.
7. **Component Reuse**: Reuse existing design system components and primitives before authoring new ones.
8. **Preserve Business Logic**: Never alter or sacrifice core business logic or data flow to make the UI look visually different.
9. **Zero Unauthorized Mocking**: Never generate fake or placeholder mock data without explicit user request or consent.
10. **Evidence-Based Visual Verification**: Never claim visual regression passes, cross-device responsiveness, or layout verification without executing real browser tests or actual runtime verification commands.
"@

# Antigravity Global Rule
$geminiRuleDir = "$env:USERPROFILE\.gemini\config\rules"
if (-not (Test-Path $geminiRuleDir)) { New-Item -ItemType Directory -Path $geminiRuleDir -Force | Out-Null }
$geminiRuleFile = Join-Path $geminiRuleDir "anti-ai-slop-enforcement.md"
[System.IO.File]::WriteAllText($geminiRuleFile, $ruleContent, [System.Text.Encoding]::UTF8)

# Universal Agents Rule
$agentsRuleDir = "$env:USERPROFILE\.agents\rules"
if (-not (Test-Path $agentsRuleDir)) { New-Item -ItemType Directory -Path $agentsRuleDir -Force | Out-Null }
$agentsRuleFile = Join-Path $agentsRuleDir "anti-ai-slop-enforcement.md"
[System.IO.File]::WriteAllText($agentsRuleFile, $ruleContent, [System.Text.Encoding]::UTF8)

# Claude Code Global CLAUDE.md Backup and Append
$claudeFile = "$env:USERPROFILE\.claude\CLAUDE.md"
if (Test-Path $claudeFile) {
    $existing = Get-Content $claudeFile -Raw -Encoding UTF8
    if (-not ($existing -match "Anti-AI-Slop & UI/UX Design Standards")) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        Copy-Item $claudeFile "$env:USERPROFILE\.claude\CLAUDE.md.bak_$timestamp" -Force
        $appendContent = "`n`n## Anti-AI-Slop & UI/UX Design Standards`n- When working on UI/UX, frontend layout, styling, or design review, activate \`anti-ai-slop\`, \`design-taste-frontend\`, or \`frontend-design\`.`n- Avoid generic purple-gradient SaaS templates; adhere strictly to existing design system tokens.`n- Preserve business logic, avoid gratuitous decorative animations/cards/glassmorphism, and never fabricate mock data or claim unverified tests.`n"
        [System.IO.File]::AppendAllText($claudeFile, $appendContent, [System.Text.Encoding]::UTF8)
    }
}

Log-Success "Universal AI Skills Installation & Anti-AI-Slop Enforcement Completed Successfully!"
