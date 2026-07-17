#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
cd "$(dirname "$0")"
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   S&O+ Ultra Workspace v2.0          ║"
echo "  ║   A arrancar o servidor...           ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Abre no navegador: http://localhost:5000"
echo ""
python3 app.py
