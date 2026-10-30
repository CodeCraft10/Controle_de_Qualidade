function New-RandomHex($length) {
  $bytes = New-Object byte[] $length
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes); return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLower() } finally { $rng.Dispose() }
}
$ErrorActionPreference = 'Stop'
$backendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$localRoot = Join-Path $backendRoot '.local'
$pgBin = 'C:\Program Files\PostgreSQL\17\bin'
if (!(Test-Path -LiteralPath (Join-Path $pgBin 'initdb.exe'))) { throw 'Instale PostgreSQL 17 ou ajuste pgBin neste script.' }
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
$pgData = Join-Path $localRoot 'pgdata'
$envFile = Join-Path $backendRoot '.env'
if (!(Test-Path -LiteralPath $envFile)) {
  $password = (New-RandomHex 24)
  $secret = (New-RandomHex 48)
  [IO.File]::WriteAllText($envFile, "PORT=3000`nDATABASE_URL=postgresql://gp4_local:${password}@127.0.0.1:55432/gp4_dev`nJWT_SECRET=${secret}`nCORS_ORIGIN=http://localhost:5173`nUPLOAD_DIR=uploads`n")
}
$dbLine = Get-Content -LiteralPath $envFile | Where-Object { $_.StartsWith('DATABASE_URL=') }
$dbUri = [Uri]($dbLine.Substring(13))
if ($dbUri.Port -ne 55432 -or $dbUri.Host -ne '127.0.0.1' -or $dbUri.AbsolutePath -ne '/gp4_dev') { throw 'O .env aponta para outro banco; não será alterado.' }
$dbPassword = $dbUri.UserInfo.Split(':')[1]
if (!(Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
  $pwFile = Join-Path $localRoot 'init-password'
  [IO.File]::WriteAllText($pwFile, $dbPassword)
  try {
    & (Join-Path $pgBin 'initdb.exe') -D $pgData -U gp4_local -A scram-sha-256 --pwfile=$pwFile --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'initdb falhou' }
  } finally { Remove-Item -LiteralPath $pwFile -ErrorAction SilentlyContinue }
}
& (Join-Path $pgBin 'pg_ctl.exe') -D $pgData status
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $pgBin 'pg_ctl.exe') -D $pgData -l (Join-Path $localRoot 'postgres.log') -o "-p 55432 -h 127.0.0.1" -w start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL local não iniciou' }
}
$env:PGPASSWORD = $dbPassword
try {
  $exists = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U gp4_local -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='gp4_dev'"
  if ($exists -ne '1') {
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U gp4_local gp4_dev
    if ($LASTEXITCODE -ne 0) { throw 'createdb falhou' }
  }
} finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
Write-Output 'Banco isolado pronto em 127.0.0.1:55432/gp4_dev. Execute npm run db:migrate.'
