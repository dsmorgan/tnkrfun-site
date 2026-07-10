# tnkrfun-site

One nginx container, two parked domains, routed by `Host` header
(see `nginx/default.conf`):

| Host | Site |
|---|---|
| `district11.net`, `www.district11.net` | `district11/` — the Office of Remaining Affairs (District 11, dissolved 1994, maintained by Gerald) |
| everything else (`tnkr.fun`, direct IP, any other domain) | `site/` — the alien transmission page + games |

The district11 match is exact on purpose: `tnkrfun.k3s0.apex.district11.net`
must fall through to the default (tnkrfun) server block.

Games under `site/` are git submodules. `deploy.sh` runs the podman compose
path; CI builds the image for the k3s deployment in `manifests/`.
