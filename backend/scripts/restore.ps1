param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
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
$psql = Join-Path $PostgresBin 'psql.exe'
$restore = Join-Path $PostgresBin 'pg_restore.exe'
if (!(Test-Path -LiteralPath $psql) -or !(Test-Path -LiteralPath $restore)) { throw "psql/pg_restore nao encontrados em $PostgresBin" }
$source = (Resolve-Path -LiteralPath $BackupFile).Path
try {
  $objects = & $psql --no-psqlrc --tuples-only --no-align --command "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f');"
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel inspecionar o banco de destino.' }
  if ([int]$objects.Trim() -ne 0) { throw 'Destino nao esta vazio; restaure em um banco/schema de homologacao vazio.' }
  $confirmation = Read-Host "Confirme o destino $($env:PGHOST):$($env:PGPORT)/$($env:PGDATABASE) digitando RESTAURAR"
  if ($confirmation -cne 'RESTAURAR') { throw 'Restauracao cancelada.' }
  & $restore --exit-on-error --no-owner --no-privileges --dbname=$($env:PGDATABASE) $source
  if ($LASTEXITCODE -ne 0) { throw "pg_restore terminou com codigo $LASTEXITCODE" }
  Write-Output 'Restauracao concluida.'
} finally {
  Remove-Item Env:PGPASSWORD,Env:PGUSER,Env:PGHOST,Env:PGPORT,Env:PGDATABASE -ErrorAction SilentlyContinue
}
