# Documentation

DocVerify AI: Supplier Onboarding — Phase 2 technical documentation.

## Phase boundary (read first)

| Phase 2 (implemented) | Phase 3 (planned, not implemented) |
| --- | --- |
| Manual document review by humans | OCR / automatic extraction |
| Checklist checks entered by reviewers | LLM verification / confidence scores |
| PostgreSQL persistence + audit logs | RAG / Qdrant-backed answers |
| Docker Compose + GitHub Actions CI | Real bank/government registry integrations |

## Core documents

| Path | Purpose |
| --- | --- |
| [`architecture.md`](./architecture.md) | System architecture |
| [`database-design.md`](./database-design.md) | Database design |
| [`api-documentation.md`](./api-documentation.md) | API reference |
| [`docker-setup.md`](./docker-setup.md) | Docker Compose guide |
| [`testing.md`](./testing.md) | Test strategy and verified results |
| [`sprint-documentation.md`](./sprint-documentation.md) | Sprint goal, backlog, review, retrospective |
| [`ci.md`](./ci.md) | How to inspect GitHub Actions |

## Supporting / historical notes

| Path | Purpose |
| --- | --- |
| [`phase-1-product-definition.md`](./phase-1-product-definition.md) | Original Phase 1 product constraints |
| [`setup.md`](./setup.md) | Condensed local setup notes |
| [`database-schema.md`](./database-schema.md) | Alias notes; prefer `database-design.md` |
| [`api.md`](./api.md) | Alias notes; prefer `api-documentation.md` |

Project overview and quick start live in the root [`README.md`](../README.md).
