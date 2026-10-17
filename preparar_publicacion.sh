#!/bin/sh
# Copia solo los archivos de la app a ./publicar, lista para arrastrar a Netlify Drop o subir a GitHub Pages.
cd "$(dirname "$0")"
rm -rf publicar && mkdir publicar
cp index.html styles.css core.js app.js sw.js manifest.webmanifest icon.svg publicar/
echo "Listo: carpeta $(pwd)/publicar"
