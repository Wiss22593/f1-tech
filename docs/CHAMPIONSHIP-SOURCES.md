# Championship source decision

Decision status: `CHAMPIONSHIP_SOURCE_USER_DECISION_REQUIRED`

| Provider | Drivers/constructors | Auth and limits | Commercial position | Decision |
| --- | --- | --- | --- | --- |
| Jolpica F1 | Verified structured 2026 standings | No key; rate limited; no uptime promise | Dataset/API terms are CC BY-NC-SA and therefore unsuitable as the default for a monetized product without separate permission | Development/tests only; blocked by default |
| Sportmonks Motorsport/F1 | Structured F1 sessions, drivers and constructors; confirm exact standings contract during trial | API token; advertised 3,000 calls/hour/endpoint; paid F1 season plan | Provider explicitly describes building commercial apps/sites and monetizing products; subscription and any F1-specific rights remain contractual | Recommended vendor evaluation |
| Sportradar Formula 1 | Structured Formula 1 season/event feeds and championship standings | API key; trial/production levels; contracted quotas | Production use requires an Order Form; advertising-related use may require prior written approval | Enterprise alternative |
| API-Sports Formula 1 | Structured endpoints and 2026 coverage | API key; free 100/day, paid tiers | Public terms say the service does not grant competition publication/commercial rights and makes the customer obtain them | Not selected for production |
| Formula1.com pages | Official displayed standings | No supported public backend contract | Site/subscription terms restrict scraping and commercial reuse | Not an ingestion source |

Sources reviewed 2026-09-09:

- Sportmonks Formula 1 and integrity/rights pages: `https://www.sportmonks.com/formula-one-api/`, `https://www.sportmonks.com/integrity-support/`
- Sportradar Formula 1 API and master terms: `https://developer.sportradar.com/racing/reference/f1-overview`, `https://developer.sportradar.com/sportradar-updates/page/terms-and-conditions`
- API-Sports Formula 1 and terms: `https://api-sports.io/sports/formula-1`, `https://api-sports.io/terms`
- Jolpica terms: `https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md`

No provider is enabled for production. The next authorized step is to trial/contract the chosen vendor, confirm that the agreement covers an advertising-supported web app and future Android app, then implement its backend mapping behind the existing `ChampionshipProvider`. Secrets stay server-side; the public client reads only a normalized last-valid dataset.
