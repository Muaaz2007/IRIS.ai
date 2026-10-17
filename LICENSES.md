# LICENSES

Licences for everything IRIS.ai depends on, plus the status of the project's own
licence.

**Versions below were recorded from the environment used for the evaluation in
[docs/EVALUATION.md](docs/EVALUATION.md).** `requirements.txt` and
`frontend/package.json` use lower-bound ranges, so a fresh install may resolve to
newer versions; check the licence of whatever you actually ship.

## Project licence

The repository does **not** contain a `LICENSE` file yet, so no licence is
currently granted for the IRIS.ai source code itself. Before publishing or
submitting, the team should choose one and add it at the repository root — MIT or
Apache-2.0 are the usual choices for a project that pulls in the dependencies
below. (Ask and it will be added.)

## Python backend

| Package | Version | Licence | Used for |
|---------|--------:|---------|----------|
| fastapi | 0.143.3 | MIT | HTTP API + SSE |
| starlette | 1.8.0 | BSD-3-Clause | ASGI toolkit under FastAPI |
| pydantic | 2.14.1 | MIT | request models/validation |
| uvicorn | 0.54.0 | BSD-3-Clause | ASGI server |
| httpx | 0.28.1 | BSD-3-Clause | async client to Ollama |
| joblib | 1.6.0 | BSD-3-Clause | model persistence |
| scikit-learn | 1.9.1 | BSD-3-Clause | TF-IDF + logistic regression |
| scipy | 1.18.1 | BSD-3-Clause | scikit-learn dependency |
| numpy | 2.5.4 | BSD-3-Clause | arrays under pandas/sklearn |
| pandas | 3.0.6 | BSD-3-Clause | dataset loading/evaluation |
| threadpoolctl | 3.7.0 | BSD-3-Clause | sklearn runtime helper |
| anyio, sniffio, h11, httpcore, idna, certifi, click, typing_extensions, annotated-types, packaging, python-dateutil, six | — | MIT / BSD / Apache-2.0 (per project) | transitive dependencies |

Diagram generation (development-only, not needed at runtime):

| Package | Version | Licence |
|---------|--------:|---------|
| matplotlib | 3.11.2 | PSF-based (matplotlib licence) |
| contourpy | 1.4.0 | BSD-3-Clause |
| cycler, kiwisolver, fonttools, pillow, pyparsing | — | MIT / BSD / OFL / Apache-2.0 (per project) |

## Frontend

| Package | Range | Licence | Used for |
|---------|-------|---------|----------|
| react, react-dom | ^18.3.1 | MIT | UI runtime |
| react-markdown | ^9.0.1 | MIT | rendering assistant markdown |
| remark-gfm | ^4.0.0 | MIT | tables/strikethrough in replies |
| lucide-react | ^0.469.0 | ISC | icons |
| clsx, tailwind-merge | ^2.1.1 / ^3.7.0 | MIT | class composition |
| vite | ^5.4.10 | MIT | dev server + build |
| @vitejs/plugin-react | ^4.3.3 | MIT | React transform |
| typescript | ~5.6.3 | Apache-2.0 | type checking |
| tailwindcss, postcss, autoprefixer | ^3.4.14 / ^8.4.47 / ^10.4.20 | MIT | styling pipeline |
| tailwindcss-animate | ^1.0.7 | MIT | animation utilities |
| esbuild (via vite) | 0.21.5 | MIT | bundler |

No frontend dependency contacts a third-party service at runtime: no analytics,
no CDN, no web fonts fetched remotely. Icons and fonts are bundled/self-hosted.

## Models and data

| Asset | Licence / status |
|-------|------------------|
| **Ollama** (runtime, not vendored) | MIT |
| **llama3.2** weights (pulled by the user, never committed) | Meta Llama 3.2 Community Licence — review its acceptable-use terms before commercial deployment; it is **not** an open-source licence in the OSI sense |
| `data/vanilla_train.csv`, `data/vanilla_test.csv`, `data/vanilla_sample.csv` | Project-supplied mixture of curated harmful/benign prompts; confirm provenance before redistributing |
| `data/benign_writing_examples.csv` | Written for this project (20 reviewed benign prompts) |
| `ml/iris_text_classifier_v3.joblib` | Trained artifact, **gitignored**; derived from the datasets above |

## Attribution requirements to keep in mind

- **Llama 3.2 Community Licence:** include the required "Built with Meta Llama"
  attribution and the licence copy in your distribution, and respect its naming and
  acceptable-use clauses.
- **Apache-2.0 (TypeScript):** not redistributed as source in the built bundle.
- **ISC (lucide-react):** include the copyright notice if you redistribute the icon set separately.

## Third-party services

None. IRIS.ai makes **no outbound network calls** at runtime: the browser talks to
the local gateway, the gateway talks to a local or privately reachable Ollama, and
nothing else. This is a design property, not an accident — see
[docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) §4 and
[docs/UAE_PDPL_COMPLIANCE.md](docs/UAE_PDPL_COMPLIANCE.md).

## How this list was produced

```bash
.venv/bin/pip list --format=freeze          # or: pip freeze
python -c "import sklearn; print(sklearn.__version__)"
cat frontend/package.json
```

Licence names follow each upstream project's own metadata (PyPI/npm); where a
transitive package's licence depends on its project, the row says so rather than
guessing. Re-check with `pip-licenses` / `license-checker` before a commercial release.
