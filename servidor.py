#!/usr/bin/env python3
"""Servidor local para probar Narra: igual que `python3 -m http.server`, pero le pide al
navegador que siempre revise si hay archivos nuevos (así no se queda con versiones viejas)."""
import http.server
import sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    http.server.ThreadingHTTPServer(('0.0.0.0', puerto), SinCache).serve_forever()
