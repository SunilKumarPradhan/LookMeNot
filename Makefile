.PHONY: install install-backend install-frontend up check-runtime

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip
PIP_FLAGS ?= --user --break-system-packages
UVICORN ?= $(PYTHON) -m uvicorn

install: install-backend install-frontend

install-backend:
	$(PIP) install $(PIP_FLAGS) -r backend/requirements.txt

install-frontend:
	cd frontend && npm install

check-runtime:
	@$(PYTHON) -c "import uvicorn" 2>/dev/null || { echo "Missing backend dependencies. Run from WSL: make install-backend"; exit 1; }
	@test -d frontend/node_modules || { echo "Missing frontend dependencies. Run from WSL: make install-frontend"; exit 1; }

up: check-runtime
	@trap 'kill 0' EXIT INT TERM; \
	(cd backend && $(UVICORN) server:app --reload --port 8000) & \
	(cd frontend && npm run dev) & \
	wait
