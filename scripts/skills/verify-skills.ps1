<#
.SYNOPSIS
    Universal AI Skills Verification Script for Windows AI Coding Agents.
.DESCRIPTION
    Verifies that target skills are properly installed, discovered, and runnable
    across Antigravity, Claude Code, Codex, and universal agent directories.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "       UNIVERSAL AI SKILLS VERIFICATION SUITE           " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$userProfile = $env:USERPROFILE
$agentsSkillsDir = Join-Path $userProfile ".agents\skills"
$claudeSkillsDir = Join-Path $userProfile ".claude\skills"
$geminiSkillsDir = Join-Path $userProfile ".gemini\config\skills"

$criticalSkills = @(
    @{ Name = "Superpowers: using-superpowers"; Folder = "using-superpowers" },
    @{ Name = "Superpowers: writing-plans"; Folder = "writing-plans" },
    @{ Name = "Superpowers: executing-plans"; Folder = "executing-plans" },
    @{ Name = "Superpowers: systematic-debugging"; Folder = "systematic-debugging" },
    @{ Name = "Matt Pocock: ask-matt"; Folder = "ask-matt" },
    @{ Name = "Matt Pocock: codebase-design"; Folder = "codebase-design" },
    @{ Name = "Karpathy: karpathy-guidelines"; Folder = "karpathy-guidelines" },
    @{ Name = "Anthropic: frontend-design"; Folder = "frontend-design" },
    @{ Name = "Ponytail: ponytail"; Folder = "ponytail" },
    @{ Name = "Ponytail: ponytail-audit"; Folder = "ponytail-audit" },
    @{ Name = "Graphify: graphify"; Folder = "graphify" },
    @{ Name = "Caveman: caveman"; Folder = "caveman" },
    @{ Name = "Caveman: cavecrew"; Folder = "cavecrew" },
    @{ Name = "Agent Skills: frontend-ui-engineering"; Folder = "frontend-ui-engineering" },
    @{ Name = "Agent Skills: using-agent-skills"; Folder = "using-agent-skills" },
    @{ Name = "Taste Skill: design-taste-frontend"; Folder = "design-taste-frontend" },
    @{ Name = "Anti-AI-Slop: anti-ai-slop"; Folder = "anti-ai-slop" }
)

$passed = 0
$failed = 0

Write-Host "--- 1. File & Directory Checks ---" -ForegroundColor Yellow
foreach ($s in $criticalSkills) {
    $inAgents = Test-Path (Join-Path $agentsSkillsDir $s.Folder)
    $inClaude = Test-Path (Join-Path $claudeSkillsDir $s.Folder)
    $inGemini = Test-Path (Join-Path $geminiSkillsDir $s.Folder)
    
    if ($inAgents -and $inClaude) {
        Write-Host " [PASS] $($s.Name.PadRight(40)) -> .agents: OK | .claude: OK | .gemini: $(if ($inGemini) {'OK'} else {'-'})" -ForegroundColor Green
        $passed++
    } else {
        Write-Host " [FAIL] $($s.Name.PadRight(40)) -> .agents: $inAgents | .claude: $inClaude" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n--- 2. Command Line Tooling Health ---" -ForegroundColor Yellow
$tools = @("claude", "codex", "opencode", "agy", "graphify")
foreach ($t in $tools) {
    $cmd = Get-Command $t -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host " [PASS] CLI $t found at $($cmd.Source)" -ForegroundColor Green
    } else {
        Write-Host " [WARN] CLI $t not in PATH" -ForegroundColor DarkYellow
    }
}

Write-Host "`n--- 3. Anti-AI-Slop Rules Verification ---" -ForegroundColor Yellow
$geminiRule = Join-Path $userProfile ".gemini\config\rules\anti-ai-slop-enforcement.md"
$agentsRule = Join-Path $userProfile ".agents\rules\anti-ai-slop-enforcement.md"
$claudeFile = Join-Path $userProfile ".claude\CLAUDE.md"

if (Test-Path $geminiRule) {
    Write-Host " [PASS] Antigravity Anti-AI-Slop Rule: OK" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Antigravity Anti-AI-Slop Rule: MISSING" -ForegroundColor Red
    $failed++
}

if (Test-Path $agentsRule) {
    Write-Host " [PASS] Universal Agents Anti-AI-Slop Rule: OK" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Universal Agents Anti-AI-Slop Rule: MISSING" -ForegroundColor Red
    $failed++
}

if ((Test-Path $claudeFile) -and ((Get-Content $claudeFile -Raw) -match "Anti-AI-Slop")) {
    Write-Host " [PASS] Claude Code Anti-AI-Slop Standards: OK" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Claude Code Anti-AI-Slop Standards: MISSING" -ForegroundColor Red
    $failed++
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "Verification Summary: $passed Passed, $failed Failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
