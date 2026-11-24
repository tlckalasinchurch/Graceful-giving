# Backup of the production database: schema, data and roles.
#
# Run it yourself in a PowerShell window (not through an AI agent session):
#   powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
#
# - Asks for the connection string with hidden input. It is never printed,
#   logged or written to a file. Use the Supabase "Session pooler" string
#   (port 5432) for the postgres role. The transaction pooler (port 6543)
#   does not work with pg_dump.
# - Needs PostgreSQL 17 client tools (pg_dump, pg_dumpall), the same major
#   version as the server. Install "Command Line Tools" from the PostgreSQL 17
#   installer, or: winget install PostgreSQL.PostgreSQL.17
# - Writes to a folder OUTSIDE the repository and refuses a folder inside it.
#   The files hold donor names and financial records: keep them private and
#   make a second copy off this computer.
# - Prints only file sizes, counts and SHA-256 hashes, never file contents.
#
# Not included: files in Supabase Storage (slip and receipt images). The
# database holds only their paths.

param(
  [string]$OutDir = (Join-Path $env:USERPROFILE ("GraceGivingBackups\" + (Get-Date -Format "yyyy-MM-dd_HHmm")))
)

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path.TrimEnd("\") + "\"
$target = [IO.Path]::GetFullPath($OutDir).TrimEnd("\") + "\"
if ($target.StartsWith($repo, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to write a backup inside the repository ($repo). Choose a folder outside it."
}

function Find-PgTool([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($v in 18, 17) {
    $p = "C:\Program Files\PostgreSQL\$v\bin\$name.exe"
    if (Test-Path $p) { return $p }
  }
  throw "$name was not found. Install the PostgreSQL 17 command line tools first."
}

$pgDump = Find-PgTool "pg_dump"
$pgDumpAll = Find-PgTool "pg_dumpall"
$versionText = & $pgDump --version
$major = [int](([regex]::Match($versionText, "(\d+)\.")).Groups[1].Value)
if ($major -lt 17) {
  throw "pg_dump $major is too old for the Postgres 17 server. Install version 17 or newer."
}
Write-Host "Using $versionText"

$secure = Read-Host "Paste the Session pooler connection string for role postgres (hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $url = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if (-not $url -or -not $url.StartsWith("postgres")) {
  throw "That does not look like a postgres:// connection string. Nothing was written."
}
if ($url -match ":6543/") {
  throw "That is the transaction pooler (port 6543). Use the Session pooler (port 5432)."
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$schemaFile = Join-Path $OutDir "gg_schema.sql"
$dataFile = Join-Path $OutDir "gg_data.sql"
$rolesFile = Join-Path $OutDir "gg_roles.sql"

function Invoke-Dump([string]$label, [scriptblock]$run) {
  Write-Host "Dumping $label ..."
  & $run
  if ($LASTEXITCODE -ne 0) { throw "Dump of $label failed (exit $LASTEXITCODE). See the message above." }
}

try {
  Invoke-Dump "schema" { & $pgDump "--dbname=$url" --schema-only --schema=public --schema=drizzle "--file=$schemaFile" }
  Invoke-Dump "data" { & $pgDump "--dbname=$url" --data-only --schema=public --schema=drizzle "--file=$dataFile" }
  # --no-role-passwords reads pg_roles instead of pg_authid, which the
  # Supabase postgres role may not read.
  Invoke-Dump "roles" { & $pgDumpAll "--dbname=$url" --roles-only --no-role-passwords "--file=$rolesFile" }
} finally {
  $url = $null
  $secure = $null
}

function Count-Lines([string]$file, [string]$pattern) {
  (Select-String -Path $file -Pattern $pattern -SimpleMatch | Measure-Object).Count
}

$checks = @(
  @{ File = $schemaFile; Label = "schema"; Pattern = "CREATE TABLE "; Min = 20 },
  @{ File = $dataFile;   Label = "data";   Pattern = "COPY ";         Min = 20 },
  @{ File = $rolesFile;  Label = "roles";  Pattern = "CREATE ROLE ";  Min = 1 }
)

$ok = $true
Write-Host ""
Write-Host "Backup folder: $OutDir"
foreach ($c in $checks) {
  $item = Get-Item $c.File -ErrorAction SilentlyContinue
  if (-not $item -or $item.Length -eq 0) {
    Write-Host ("FAIL  {0}: file missing or empty" -f $c.Label)
    $ok = $false
    continue
  }
  $n = Count-Lines $c.File $c.Pattern
  $hash = (Get-FileHash $c.File -Algorithm SHA256).Hash.ToLower()
  $status = if ($n -ge $c.Min) { "PASS" } else { "FAIL" }
  if ($status -eq "FAIL") { $ok = $false }
  Write-Host ("{0}  {1}: {2:N0} bytes, {3} x '{4}' (need >= {5}), sha256 {6}" -f $status, $c.Label, $item.Length, $n, $c.Pattern.Trim(), $c.Min, $hash)
}

# The migration record and the money tables must be in the data dump.
foreach ($t in @("drizzle.__drizzle_migrations", "public.offerings", "public.expenses", "public.finance_accounts", "public.audit_logs")) {
  $found = (Select-String -Path $dataFile -Pattern ("COPY " + $t + " ") -SimpleMatch | Measure-Object).Count -gt 0
  if (-not $found) { $ok = $false }
  Write-Host ("{0}  data contains {1}" -f $(if ($found) { "PASS" } else { "FAIL" }), $t)
}

Write-Host ""
if ($ok) {
  Write-Host "RESULT: PASS. Copy this folder to a second safe place (off this computer)."
  exit 0
} else {
  Write-Host "RESULT: FAIL. Do not apply the migration. Report the FAIL lines above."
  exit 1
}
