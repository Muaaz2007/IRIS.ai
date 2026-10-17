# IRIS.ai documentation

Start with the main [README](../README.md), then pick by question.

| Question | Document |
|----------|----------|
| What are the components and how do they connect? | [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) |
| What does each component take in and give out, and where is its code? | [COMPONENT_SPEC.md](COMPONENT_SPEC.md) |
| How was the classifier trained, and how accurate is it? | [ML_FLOW.md](ML_FLOW.md) |
| What happens when a user sends a prompt? | [USER_FLOW.md](USER_FLOW.md) |
| What exactly does the API return? | [API_CONTRACT.md](API_CONTRACT.md) |
| Which attacks are detected, and with what coverage? | [THREAT_MODEL.md](THREAT_MODEL.md) |
| What are the measured results, and what is missing? | [EVALUATION.md](EVALUATION.md) |
| How do I deploy this on LinuxONE? | [DEPLOYMENT.md](DEPLOYMENT.md) |
| What about privacy, residency and audit? | [UAE_PDPL_COMPLIANCE.md](UAE_PDPL_COMPLIANCE.md) |
| How do I run and test it locally? | [../RUN_LOCAL.md](../RUN_LOCAL.md) |

## Diagrams

All five PNGs are generated from code — no manual drawing:

```bash
pip install -r requirements.txt      # matplotlib is the only extra
python docs/diagrams/build_diagrams.py
```

| File | Shows |
|------|-------|
| `diagrams/system_architecture.png` | 8 components, connections, trust boundary |
| `diagrams/ml_pipeline.png` | training phase → artifact → inference phase → risk score |
| `diagrams/user_flow.png` | prompt → screened → allow / warn / block → answer |
| `diagrams/system_flow.png` | request timeline with the latency breakdown |
| `diagrams/data_flow.png` | normalize → rules → classifier → session → policy, and what is stored |

Editing a diagram means editing `diagrams/build_diagrams.py` and re-running it, so
the pictures cannot drift from the numbers quoted in the documents.
