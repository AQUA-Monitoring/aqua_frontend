# Aqua frontend releases

`AQUA-Monitoring/aqua_frontend` is the single frontend source repository, with
GitHub environments `development` and `production`. `aqua_beta` is retired as a
source of new releases. Both environments currently use the shared backend at
`https://api-aqua.michalski.app/api/`, including its production data.

## Source and publication

- Pushes to `dev` build the current `dev` HEAD for `development`.
- Manual runs of **Aqua frontend release** select `development` or `production`.
  Production requires a full `release_ref` SHA reachable from `dev`.
  Development accepts only the current `dev` HEAD.
- Keep the workflow registered on the repository default branch so GitHub can
  offer manual dispatch. Application source is selected from `dev`.
- Both environments publish `ghcr.io/aqua-monitoring/aqua-frontend`, tagged as
  `<environment>-<sha>`. Runtime deployment uses the returned immutable digest.
- Build caches and workflow concurrency are separate for each environment.
- Release artifacts record the environment, SHA, image digest and workflow run.
  `/release.json` reports the served source SHA; `/health` reports nginx health.

## GitHub environment configuration

Create `development` and `production` in the `aqua_frontend` repository. Configure
these variables separately in each environment:

| Variable | Value |
| --- | --- |
| `VITE_BASE_URL` | `https://api-aqua.michalski.app/api/` |
| `AQUA_DEPLOY_ENABLED` | `false` until the server migration is complete |
| `AQUA_DEPLOY_HOST` | SSH host reachable from GitHub-hosted runners |
| `AQUA_DEPLOY_PORT` | SSH port; defaults to `22` |
| `AQUA_DEPLOY_USER` | Restricted SSH account dedicated to this environment |
| `AQUA_PUBLIC_URL` | HTTPS URL of this environment; production uses `https://aqua.michalski.app` |

Environment secrets: `VITE_MAPBOX_API_KEY`, `AQUA_DEPLOY_SSH_KEY`, and
`AQUA_DEPLOY_KNOWN_HOSTS`. Pin the verified server host key. Configure additional
`VITE_*` variables/secrets consumed by the workflow as needed. These build-time
values are public browser configuration; never include backend credentials.
Production should have GitHub environment protection rules for release approval.

The Docker build verifies the production API URL in compiled JavaScript through
`npm run verify:production-build`. Changing container environment variables does
not change a compiled bundle. Push subscriptions obtain VAPID configuration from
the backend flow.

## Server migration and activation

The existing server-management deploy helper still uses the historical
`frontend`/`beta` channels and repository/image restrictions. Before enabling CI
deployment, migrate that helper and its manifests to two environments of
`AQUA-Monitoring/aqua_frontend`, both accepting `aqua-frontend` image digests.
Bind each SSH key to its own environment, validate the workflow's environment,
retain stale-release protection, and configure the matching public routes.
Do not point development at the production SSH account.

Disable the old `aqua_beta` release workflow before activating the new development
pipeline. Existing services and rollback records are retained until the new
routes and health checks have been verified. These repository changes do not
perform server migration or change remote GitHub settings.

With `AQUA_DEPLOY_ENABLED=false`, CI builds and publishes an image and artifact
without deploying. The deploy command passes a transient job token over SSH stdin
for registry access and run validation. Backend migrations are outside this flow.

## Local development

Create `aqua_frontend/.env` from `.env.example` and fill in the public integration
settings. The Compose configuration no longer reads `aqua_beta/.env`.

```sh
docker compose -p aqua-dev -f compose.dev.yml up -d --build
```

Vite is exposed at `127.0.0.1:5000`, proxies `/api/` to the shared backend, and
proxies `/hls/` to the existing streaming service. Local development also accesses
production data unless `VITE_PROXY_TARGET` is overridden.
