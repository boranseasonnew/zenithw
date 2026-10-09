param()
Add-Type -AssemblyName System.Drawing
$repoDesktop = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Join-Path $repoDesktop 'src/brand.png'))
try {
  $packageAssets = Join-Path $repoDesktop 'build/appx'
  $listingAssets = Join-Path $repoDesktop 'store/assets'
  New-Item -ItemType Directory -Force -Path $packageAssets,$listingAssets | Out-Null
  $sizes = @(@('StoreLogo',50,50),@('Square44x44Logo',44,44),@('Square150x150Logo',150,150),@('Square310x310Logo',310,310),@('Wide310x150Logo',310,150),@('StoreLogo-300',300,300),@('StoreLogo-150',150,150))
  foreach ($size in $sizes) {
    $width=[int]$size[1]; $height=[int]$size[2]
    $canvas=New-Object System.Drawing.Bitmap($width,$height)
    $graphics=[System.Drawing.Graphics]::FromImage($canvas)
    try {
      $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#151515'))
      $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $edge=[int]([Math]::Min($width,$height)*0.82)
      $ratio=[Math]::Min($edge/$source.Width,$edge/$source.Height)
      $logoWidth=[int]($source.Width*$ratio); $logoHeight=[int]($source.Height*$ratio)
      $graphics.DrawImage($source,[int](($width-$logoWidth)/2),[int](($height-$logoHeight)/2),$logoWidth,$logoHeight)
      $destination=if($size[0] -like 'StoreLogo-*') {$listingAssets} else {$packageAssets}
      $canvas.Save((Join-Path $destination ($size[0]+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    } finally {$graphics.Dispose(); $canvas.Dispose()}
  }
} finally {$source.Dispose()}
