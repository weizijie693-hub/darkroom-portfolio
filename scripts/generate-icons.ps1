Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\Administrator\Desktop\我\摄影集"
$iconsDir   = Join-Path $projectRoot "icons"

if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

$sizes = @(72, 96, 128, 144, 152, 180, 192, 384, 512)

foreach ($size in $sizes) {
    $W = $size
    $H = $size

    $bmp  = New-Object System.Drawing.Bitmap($W, $H)
    $g    = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Background - deep black #0a0a0a
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 10, 10))
    $g.FillRectangle($bgBrush, 0, 0, $W, $H)

    # Radial glow - warm center
    $glowCenterX = [int]($W * 0.4)
    $glowCenterY = [int]($H * 0.35)
    $glowSteps = 12
    for ($i = $glowSteps; $i -ge 0; $i--) {
        $ratio = $i / $glowSteps
        $alpha = [int](18 * (1.0 - $ratio))
        $r = [int](10 + 4 * $ratio)
        $gVal = [int](8 + 3 * $ratio)
        $bVal = [int](6 + 2 * $ratio)
        $color = [System.Drawing.Color]::FromArgb($alpha, $r, $gVal, $bVal)
        $brush = New-Object System.Drawing.SolidBrush($color)
        $cx = $glowCenterX + [int]((0.5 - $ratio) * $W * 0.15)
        $cy = $glowCenterY + [int]((0.5 - $ratio) * $H * 0.15)
        $rad = [int]($W * 0.08 + $ratio * $W * 0.55)
        $g.FillEllipse($brush, $cx - $rad, $cy - $rad, $rad * 2, $rad * 2)
        $brush.Dispose()
    }

    # Film sprocket holes - top and bottom
    $holeFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 26, 26))
    $holeGap  = [int]($W * 0.06)
    $holeW    = [Math]::Max(2, [int]($W * 0.014))
    $holeH    = [Math]::Max(2, [int]($W * 0.025))
    $holeYtop = [int]($W * 0.025)
    $holeYbot = $H - $holeYtop - $holeH
    for ($x = $holeGap; $x + $holeW -lt $W; $x += $holeGap) {
        if ($holeW -gt 0 -and $holeH -gt 0) {
            $g.FillRectangle($holeFill, $x, $holeYtop, $holeW, $holeH)
            $g.FillRectangle($holeFill, $x, $holeYbot, $holeW, $holeH)
        }
    }
    $holeFill.Dispose()

    # Center character - try SimSun, then Microsoft YaHei, then Arial
    $fontSize = [int]($W * 0.38)
    $chineseFont = $null
    $fontNames = @("SimSun", "Microsoft YaHei", "FangSong", "KaiTi", "NSimSun", "Arial")
    foreach ($fam in $fontNames) {
        try {
            $testFont = New-Object System.Drawing.Font($fam, 10)
            $candidate = New-Object System.Drawing.Font($fam, $fontSize, [System.Drawing.FontStyle]::Regular)
            $chineseFont = $candidate
            $testFont.Dispose()
            break
        } catch { }
    }
    if ($null -eq $chineseFont) {
        $chineseFont = New-Object System.Drawing.Font("Arial", $fontSize)
    }

    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(224, 216, 200))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment     = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textY = $H * 0.44
    $charToDraw = [char]0x6697  # Unicode for the Chinese char
    $g.DrawString($charToDraw.ToString(), $chineseFont, $textBrush,
        [System.Drawing.RectangleF]::new(0, $textY - $fontSize * 0.7, $W, $fontSize * 1.4), $sf)

    # "DARKROOM" text below
    $enFontSize = [int]($W * 0.06)
    $enFont = New-Object System.Drawing.Font("Arial", $enFontSize, [System.Drawing.FontStyle]::Light)
    $enBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(138, 128, 112))
    $enY     = $H * 0.72
    $g.DrawString("DARKROOM", $enFont, $enBrush,
        [System.Drawing.RectangleF]::new(0, $enY - $enFontSize * 0.5, $W, $enFontSize * 1.2), $sf)

    # Corner accents - warm gold
    $cornerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(64, 200, 180, 140), 1)
    $m  = [int]($W * 0.1)
    $cl = [int]($W * 0.06)
    if ($cl -gt 0) {
        # Top-Left
        $g.DrawLine($cornerPen, $m, $m + $cl, $m, $m)
        $g.DrawLine($cornerPen, $m, $m, $m + $cl, $m)
        # Top-Right
        $g.DrawLine($cornerPen, $W - $m - $cl, $m, $W - $m, $m)
        $g.DrawLine($cornerPen, $W - $m, $m, $W - $m, $m + $cl)
        # Bottom-Left
        $g.DrawLine($cornerPen, $m, $H - $m - $cl, $m, $H - $m)
        $g.DrawLine($cornerPen, $m, $H - $m, $m + $cl, $H - $m)
        # Bottom-Right
        $g.DrawLine($cornerPen, $W - $m - $cl, $H - $m, $W - $m, $H - $m)
        $g.DrawLine($cornerPen, $W - $m, $H - $m, $W - $m, $H - $m - $cl)
    }

    # Save PNG
    $outPath = Join-Path $iconsDir "icon-$size.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $cornerPen.Dispose()
    $enBrush.Dispose()
    $enFont.Dispose()
    $textBrush.Dispose()
    $sf.Dispose()
    $chineseFont.Dispose()
    $bgBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()

    Write-Host "OK: icon-$size.png ($($size)x$($size))"
}

Write-Host ""
Write-Host "All icons generated in: $iconsDir"
