param(
    [string]$Command = "help"
)

$RED = "`e[31m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[34m"
$NC = "`e[0m"

function Show-Help {
    Write-Host "$BLUE🛍️Script de Desarrollo$NC"
    Write-Host ""
    Write-Host "Uso: ./scripts/dev.ps1 [comando]"
    Write-Host ""
    Write-Host "Comandos disponibles:"
    Write-Host "  ${GREEN}start${NC}     - Levantar todos los servicios"
    Write-Host "  ${GREEN}stop${NC}      - Parar todos los servicios"
    Write-Host "  ${GREEN}restart${NC}   - Reiniciar todos los servicios"
    Write-Host "  ${GREEN}logs${NC}      - Ver logs de todos los servicios"
    Write-Host "  ${GREEN}test${NC}      - Ejecutar tests"
    Write-Host "  ${GREEN}build${NC}     - Construir imágenes Docker"
    Write-Host "  ${GREEN}clean${NC}     - Limpiar contenedores e imágenes"
    Write-Host "  ${GREEN}status${NC}    - Ver estado de los servicios"
    Write-Host "  ${GREEN}help${NC}      - Mostrar esta ayuda"
}

function Check-Docker {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "${RED}❌ Docker no está instalado o no está en el PATH.${NC}"
        exit 1
    }
    try {
        docker info | Out-Null
    } catch {
        Write-Host "${RED}❌ Docker no está corriendo. Por favor inicia Docker Desktop.${NC}"
        exit 1
    }
}

function Check-Env {
    if (-not (Test-Path ".env")) {
        Write-Host "${YELLOW}⚠️  Archivo .env no encontrado.${NC}"
        "GEMINI_API_KEY=tu_api_key_de_gemini_aqui" | Out-File ".env"
        Write-Host "${GREEN}✅ Archivo .env creado. Por favor edítalo con tu API key real.${NC}"
    }
}

switch ($Command.ToLower()) {
    "start" {
        Write-Host "${BLUE}🚀 Iniciando servicios...${NC}"
        Check-Docker
        Check-Env
        docker compose up -d
        Write-Host "${GREEN}✅ Servicios iniciados.${NC}"
    }
    "stop" {
        Write-Host "${YELLOW} Parando servicios...${NC}"
        Check-Docker
        docker compose down
        Write-Host "${GREEN}✅ Servicios parados.${NC}"
    }
    "restart" {
        Write-Host "${BLUE} Reiniciando servicios...${NC}"
        Check-Docker
        docker compose down
        docker compose up -d
        Write-Host "${GREEN}✅ Servicios reiniciados.${NC}"
    }
    "logs" {
        Write-Host "${BLUE} Mostrando logs...${NC}"
        Check-Docker
        docker compose logs -f
    }
    "build" {
        Write-Host "${BLUE}🔨 Construyendo imágenes Docker...${NC}"
        Check-Docker
        docker compose up --build
        Write-Host "${GREEN} Imágenes construidas.${NC}"
    }
    "clean" {
        Write-Host "${YELLOW} Limpiando contenedores e imágenes...${NC}"
        Check-Docker
        docker compose down --rmi all --volumes --remove-orphans
        docker system prune -f
        Write-Host "${GREEN}Limpieza completada.${NC}"
    }
    "status" {
        Write-Host "${BLUE}Estado de los servicios:${NC}"
        Check-Docker
        docker compose ps
    }
    Default {
        Show-Help
    }
}
