# Legacy AWS/Kubernetes setup

Archived on 2026-08-06. These describe the pipeline/infra used when the
backend and frontend were deployed to a self-managed Kubernetes cluster with
Docker images pushed to AWS ECR. That setup was retired after moving the
frontend to Vercel and the backend to Render (AWS free-tier resources were
exhausted).

Kept here for reference / in case Kubernetes comes back into the picture
later — not part of the active deploy path. See ../../CI-CD-GUIDE.md for the
current GitHub Actions setup.

- `Jenkinsfile` — old Jenkins pipeline (build → ECR push → kubectl deploy)
- `k8s/` — Kubernetes manifests (namespace, configmap, secrets, per-service)
