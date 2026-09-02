const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '../out')
const publicDir = path.join(__dirname, '../public')
const nextStaticDir = path.join(__dirname, '../.next/static')
const nextAppDir = path.join(__dirname, '../.next/server/app')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

// 1. Copy Public Assets
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, outDir, { recursive: true })
}

// 2. Copy Next Static Chunks
const outNextDir = path.join(outDir, '_next/static')
if (fs.existsSync(nextStaticDir)) {
  fs.mkdirSync(outNextDir, { recursive: true })
  fs.cpSync(nextStaticDir, outNextDir, { recursive: true })
}

// 3. Copy Server App Static HTML files if present
if (fs.existsSync(nextAppDir)) {
  const appFiles = fs.readdirSync(nextAppDir)
  appFiles.forEach(file => {
    if (file.endsWith('.html')) {
      fs.copyFileSync(path.join(nextAppDir, file), path.join(outDir, file))
    }
  })
}

// 4. Ensure index.html exists
const indexHtmlPath = path.join(outDir, 'index.html')
if (!fs.existsSync(indexHtmlPath)) {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>NIRMAAN OS</title>
</head>
<body style="background-color:#000000; color:#FFFFFF;">
  <div id="__next"></div>
</body>
</html>`
  fs.writeFileSync(indexHtmlPath, htmlContent, 'utf8')
}

console.log('✅ Capacitor out static assets prepared with 0ms launch lag!')
