#!/bin/bash


set -e

# 🎨 Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No color

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED} Docker no está corriendo. Inícialo primero.${NC}"
        exit 1
    fi
}

check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  Archivo .env no encontrado.${NC}"
        echo "Creando archivo .env de ejemplo..."
        echo "GEMINI_API_KEY=tu_api_key_de_gemini_aqui" > .env
        echo -e "${GREEN}✅ Archivo .env creado. Editalo con tus valores reales.${NC}"
    fi
}

show_help() {
    echo -e "${BLUE} Comandos disponibles:${NC}"
    echo "  ${GREEN}start${NC}   → Levanta los servicios con Docker Compose"
    echo "  ${GREEN}stop${NC}    → Detiene todos los servicios"
    echo "  ${GREEN}status${NC}  → Muestra el estado de los contenedores"
    echo "  ${GREEN}logs${NC}    → Muestra los logs en tiempo real"
    echo "  ${GREEN}help${NC}    → Muestra esta ayuda"
}

# 🚀 Comandos principales
case "${1:-help}" in
    start)
        echo -e "${BLUE}🚀 Iniciando servicios...${NC}"
        check_docker
        check_env
        docker compose up -d
        echo -e "${GREEN}✅ Servicios iniciados.${NC}"
        ;;
    stop)
        echo -e "${YELLOW}Deteniendo servicios...${NC}"
        check_docker
        docker compose down
        echo -e "${GREEN}Servicios detenidos.${NC}"
        ;;
    status)
        echo -e "${BLUE}Estado de los servicios:${NC}"
        check_docker
        docker compose ps
        ;;
    logs)
        echo -e "${BLUE}📋 Mostrando logs... (Ctrl+C para salir)${NC}"
        check_docker
        docker compose logs -f
        ;;
    help|*)
        show_help
        ;;
esac
