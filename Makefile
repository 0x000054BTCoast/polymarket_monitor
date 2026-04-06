.PHONY: backend-install backend-run backend-test frontend-install frontend-run

backend-install:
	python -m venv .venv && . .venv/bin/activate && pip install -r backend/requirements.txt

backend-run:
	cd backend && PYTHONPATH=. uvicorn app.main:app --reload --port 8000

backend-test:
	cd backend && PYTHONPATH=. pytest -q

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev
