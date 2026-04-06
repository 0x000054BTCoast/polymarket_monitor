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
	cd frontend && \
		tmp_npm_global=$$(mktemp) && \
		env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy \
		-u NPM_CONFIG_PROXY -u NPM_CONFIG_HTTPS_PROXY -u npm_config_proxy -u npm_config_https_proxy \
		-u npm_config_http_proxy -u npm_config_http-proxy -u npm_config_https-proxy \
		npm --userconfig=/dev/null --globalconfig=$$tmp_npm_global install \
		--registry=https://registry.npmjs.org/ && \
		rm -f $$tmp_npm_global

frontend-run:
	cd frontend && npm run dev
