# Riddle

Fun riddle game based on Wordle style

Riddles from <https://github.com/crawsome/PyRPG_Mini/blob/master/csv/riddles.csv>

## Deployment

Hosted on Cloudflare Pages at <https://riddle.peebles.lol>, deployed by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

- Push to `main` → tests, build, production deploy, and ensures the
  `riddle.peebles.lol` custom domain + proxied CNAME in the `peebles.lol` zone.
- Pull requests → preview deploy at `<branch>.<project>.pages.dev`.

The Pages project, custom domain and DNS record are created on first run if missing
(see [`.github/scripts/cloudflare-pages.sh`](.github/scripts/cloudflare-pages.sh)).

Required repository secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token with for `peebles.lol` |

## Cloudflare Permissions

**Account › Cloudflare Pages › Edit**, **Zone
› DNS › Edit** and **Zone › Zone › Read**
