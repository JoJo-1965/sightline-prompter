# Plan first. -Run is an explicit installation; never use it during RC review.
[CmdletBinding()]
param(
	[string]$CandidateDirectory,
	[string]$InstallDirectory = (Join-Path ([Environment]::GetFolderPath('ProgramFiles')) 'Sightline Prompter'),
	[switch]$Run,
	[switch]$Silent
)

function Get-SightlineInstallArguments {
	param([string]$Directory, [switch]$Silent)
	if ($Directory -notmatch '^[A-Za-z]:\\' -or $Directory -match '["\r\n]' -or $Directory.TrimEnd('\').Length -le 3) {
		throw 'Choose an absolute installation folder on a local drive, without quotes or line breaks.'
	}
	# NSIS requires /D last and unquoted, including paths containing spaces:
	# https://nsis.sourceforge.io/Docs/Chapter3.html#installerusage
	$prefix = if ($Silent) { '/S /allusers' } else { '/allusers' }
	return "$prefix /D=$Directory"
}

# Dot-sourcing exposes only the argument builder for the harmless NSIS test.
if ($MyInvocation.InvocationName -eq '.') { return }
$ErrorActionPreference = 'Stop'
if (-not $CandidateDirectory) { throw 'Specify the candidate folder containing BUILD-MANIFEST.json.' }
$candidatePath = (Resolve-Path -LiteralPath $CandidateDirectory).Path
$manifest = Get-Content -LiteralPath (Join-Path $candidatePath 'BUILD-MANIFEST.json') -Raw | ConvertFrom-Json
$installerPath = Join-Path $candidatePath $manifest.app.file
if ([IO.Path]::GetFileName($manifest.app.file) -ne $manifest.app.file) { throw 'The manifest installer must be a filename, not a path.' }
if ((Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash -ne $manifest.app.sha256) { throw 'Installer hash does not match the candidate manifest.' }
$targetPath = [IO.Path]::GetFullPath($InstallDirectory)
$sightlineArguments = Get-SightlineInstallArguments -Directory $targetPath -Silent:$Silent
if (-not $Run) {
	[pscustomobject]@{ Mode='Plan only'; Version=$manifest.app.version; Installer=$installerPath; Destination=$targetPath; Arguments=$sightlineArguments; AdministratorApproval='Required when Run is used'; AppChanges='None' }
	return
}
if (Get-Process -Name 'Sightline Prompter' -ErrorAction SilentlyContinue) { throw 'Close Sightline normally before installing, saving any changes. No process was forced closed.' }
$statePath = Join-Path $env:APPDATA 'Sightline Prompter/app-state.json'
if (Test-Path -LiteralPath $statePath) {
	$backupPath = Join-Path $env:LOCALAPPDATA ('Sightline Prompter/Upgrade Backups/Install-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
	New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
	Copy-Item -LiteralPath $statePath -Destination (Join-Path $backupPath 'app-state.json')
}
$windowStyle = if ($Silent) { 'Hidden' } else { 'Normal' }
# Elevate this installer directly, preserving the complete destination argument.
$setup = Start-Process -FilePath $installerPath -ArgumentList $sightlineArguments -Verb RunAs -WindowStyle $windowStyle -Wait -PassThru
if ($setup.ExitCode -ne 0) { throw "Installer exited with code $($setup.ExitCode)." }
$installedExe = Join-Path $targetPath 'Sightline Prompter.exe'
if (-not (Test-Path -LiteralPath $installedExe)) { throw "Installation did not reach the intended folder: $targetPath. Do not treat it as complete." }
$installedVersion = (Get-Item -LiteralPath $installedExe).VersionInfo.FileVersion
if ($installedVersion -ne $manifest.app.version) { throw "The intended folder contains $installedVersion, expected $($manifest.app.version)." }
[pscustomobject]@{ Installed=$installedVersion; Location=$targetPath; Verified=$true }
