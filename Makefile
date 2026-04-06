.PHONY: backend-install backend-run backend-test frontend-install frontend-run

backend-install:
	PYTHON_BIN=$$(command -v python3 || command -v python); \
	PIP_BIN=$$(command -v pip3 || command -v pip); \
	$$PYTHON_BIN -m venv .venv && . .venv/bin/activate && $$PIP_BIN install -r backend/requirements.txt

backend-run:
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --port 8000

backend-test:
	cd backend && PYTHONPATH=. pytest -q

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev
