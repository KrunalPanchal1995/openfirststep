# Back up the three repos as verified git bundles to a local folder and to OneDrive.
#   powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
# Each bundle holds the full history (all branches and tags) and restores with: git clone <file>.bundle
# openfirststep-data is private and contains the visitor JSON, so the OneDrive copy is only as safe as that account (use 2FA).
param(
    [string[]]$Repos = @("KrunalPanchal1995.github.io", "openfirststep", "openfirststep-data"),
    [string]$Owner = "KrunalPanchal1995",
    [string[]]$Destinations = @("D:\KrunalPanchal1995\backups", "$env:OneDrive\Backups\website"),
    [int]$Keep = 3   # the site bundle is ~600 MB; 3 weekly copies stay well inside a free OneDrive
)
# git writes progress/"ok" messages to stderr, which Windows PowerShell 5.1 treats as errors under "Stop".
# Native calls are checked via $LASTEXITCODE; cmdlets below use -ErrorAction Stop explicitly.
$ErrorActionPreference = "Continue"
$stamp = Get-Date -Format "yyyy-MM-dd"
$work = Join-Path $env:TEMP "ofs-backup-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $work -ErrorAction Stop | Out-Null
$manifest = @()

try {
    foreach ($repo in $Repos) {
        $mirror = Join-Path $work "$repo.git"
        git clone --quiet --mirror "https://github.com/$Owner/$repo.git" $mirror 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "clone failed: $repo" }
        $bundle = Join-Path $work "$repo-$stamp.bundle"
        git -C $mirror bundle create $bundle --all 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "bundle failed: $repo" }
        git -C $mirror bundle verify $bundle 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "bundle verify failed: $repo" }
        $hash = (Get-FileHash $bundle -Algorithm SHA256 -ErrorAction Stop).Hash
        $manifest += "$hash  $(Split-Path $bundle -Leaf)"
        Remove-Item -Recurse -Force $mirror
    }
    $manifest | Set-Content -Path (Join-Path $work "SHA256SUMS.txt") -Encoding ascii

    foreach ($dest in $Destinations) {
        if (-not $dest -or $dest -like "\Backups*" -or -not (Test-Path (Split-Path $dest -Qualifier))) { Write-Warning "skipping empty destination"; continue }
        $target = Join-Path $dest $stamp
        New-Item -ItemType Directory -Force -Path $target -ErrorAction Stop | Out-Null
        Get-ChildItem $work -File | Copy-Item -Destination $target -Force -ErrorAction Stop
        # Re-verify the copies against the manifest.
        foreach ($line in $manifest) {
            $h, $name = $line -split "\s+", 2
            if ((Get-FileHash (Join-Path $target $name) -Algorithm SHA256 -ErrorAction Stop).Hash -ne $h) { throw "copy corrupted: $name in $target" }
        }
        # Keep the newest $Keep dated folders.
        Get-ChildItem $dest -Directory | Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
            Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item -Recurse -Force
        Write-Host "OK  $target"
    }
    $manifest | ForEach-Object { Write-Host $_ }
}
finally {
    Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}

