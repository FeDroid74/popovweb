Add-Type -AssemblyName System.Drawing
$rootPath = Split-Path -Parent $PSScriptRoot
$fonts = [System.Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile((Join-Path $rootPath 'assets/font-3.ttf'))
$family = $fonts.Families[0]
foreach ($locale in @('ru','en')) {
  $bitmap = [System.Drawing.Bitmap]::new(1200,630)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#1b1c1a'))
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f5f5f2'))
  $accent = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f76a38'))
  $muted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#a4a69e'))
  $brand = [System.Drawing.Font]::new($family, 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $heading = [System.Drawing.Font]::new($family, 78, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $caption = [System.Drawing.Font]::new($family, 25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString('PopovWeb', $brand, $white, 70, 55)
  $graphics.FillEllipse($accent, 255, 73, 12, 12)
  $line1 = if ($locale -eq 'ru') { 'Дизайн и' } else { 'Web design' }
  $line2 = if ($locale -eq 'ru') { 'разработка сайтов' } else { '& development' }
  $name = if ($locale -eq 'ru') { 'Федор Попов' } else { 'Fedor Popov' }
  $graphics.DrawString($line1, $heading, $white, 65, 205)
  $graphics.DrawString($line2, $heading, $accent, 65, 303)
  $graphics.DrawString($name, $caption, $muted, 70, 527)
  $pen = [System.Drawing.Pen]::new($accent, 3)
  $graphics.DrawLine($pen, 1030, 548, 1125, 548)
  $graphics.DrawLine($pen, 1108, 531, 1125, 548)
  $graphics.DrawLine($pen, 1108, 565, 1125, 548)
  $bitmap.Save((Join-Path $rootPath "assets/social-$locale.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose(); $brand.Dispose(); $heading.Dispose(); $caption.Dispose(); $white.Dispose(); $muted.Dispose(); $accent.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
$fonts.Dispose()
