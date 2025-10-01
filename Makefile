.PHONY: help dev test test-verbose clean logs ingest health

help:
	@echo "AI Policy Helper - Available commands:"
	@echo "  make dev            - Start all services with Docker Compose"
	@echo "  make test           - Run backend tests (quiet mode)"
	@echo "  make test-verbose   - Run backend tests (verbose mode)"
	@echo "  make clean          - Stop and remove all containers"
	@echo "  make logs           - Tail logs from all services"
	@echo "  make ingest         - Trigger document ingestion via API"
	@echo "  make health         - Check system health"

dev:
	docker compose up --build

test:
	docker compose run --rm backend pytest -q

test-verbose:
	docker compose run --rm backend pytest -v

clean:
	docker compose down -v

logs:
	docker compose logs -f

ingest:
	@echo "Triggering document ingestion..."
	@curl -X POST http://localhost:8000/api/ingest || echo "Backend not running. Start with 'make dev' first."

health:
	@echo "Checking system health..."
	@curl -s http://localhost:8000/api/health | python3 -m json.tool || echo "Backend not running."
