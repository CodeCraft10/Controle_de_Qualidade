param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups'),
  [string]$PostgresBin = 'C:\Program Files\PostgreSQL\17\bin'
)
$ErrorActionPreference = 'Stop'
$backendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$envFile = Join-Path $backendRoot '.env'
if (!(Test-Path -LiteralPath $envFile)) { throw 'Arquivo backend/.env nao encontrado.' }
$line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (!$line) { throw 'DATABASE_URL ausente no .env.' }
$uri = [Uri]($line.Substring('DATABASE_URL='.Length))
$parts = $uri.UserInfo -split ':',2
$env:PGUSER = [Uri]::UnescapeDataString($parts[0])
$env:PGPASSWORD = if ($parts.Count -gt 1) { [Uri]::UnescapeDataString($parts[1]) } else { '' }
$env:PGHOST = $uri.Host
$env:PGPORT = if ($uri.Port -gt 0) { [string]$uri.Port } else { '5432' }
$env:PGDATABASE = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
$dump = Join-Path $PostgresBin 'pg_dump.exe'
if (!(Test-Path -LiteralPath $dump)) { throw "pg_dump nao encontrado em $PostgresBin" }
$target = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $target | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $target "$($env:PGDATABASE)-$stamp.dump"
try {
  & $dump --format=custom --no-owner --no-privileges --file=$file
  if ($LASTEXITCODE -ne 0) { throw "pg_dump terminou com codigo $LASTEXITCODE" }
  Write-Output "Backup criado: $file"
} finally {
  Remove-Item Env:PGPASSWORD,Env:PGUSER,Env:PGHOST,Env:PGPORT,Env:PGDATABASE -ErrorAction SilentlyContinue
}
