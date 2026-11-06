# Practice Carpool Coord

Practice carpool coordination board for **Riley (Ri, Aspire U14G Copa)** and **Jordan (Jo, API 11u Solomon + Green Hornets 12U)** — who drops / who picks. **Not a tactics board.** TokenMax burn build.

Standing facts only (practices, not games). Grandparent / team-parent slots show a **Needs confirm** badge — never auto-assigned as settled. EXAMPLE week fills labeled clearly. Notes persist in `localStorage`.

## Screens

1. **Week board** — Mon–Sun drop vs pickup grid  
2. **Standing rules** — Jo daily carpool drops + Alex pickups; Ri Tue Aspire carpool; Ri Thu Alex drive to Northside Academy  
3. **Print** — AirPrint fridge sheet  
4. **About** — export / reset

Hash routes: `#board` · `#standing` · `#print` · `#about`

## Run

```bash
./run.sh          # build + serve http://127.0.0.1:4317/
./run.sh --shots  # + screenshots/
```

Offline single file: `dist/carpool-coord.html`

## Layout

- `web/` — index.html, app.css, app.js  
- `data/carpools.json` — standing facts + EXAMPLE fills (embedded into dist)  
- `build.py` / `server.py` / `tests/screenshot.sh`

Kids are only Ri and Jo. Always ask before assuming Pat/Morgan, Casey, or team-parent coverage.


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Alex's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/carpool-coord` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
