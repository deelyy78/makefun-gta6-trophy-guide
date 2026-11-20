# makefun-gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/deelyy78/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/deelyy78/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Legend** — an offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5. Every trophy carries its official name, description and grade, plus a guide written for this entry that names its sources: what to do, where and how, and when it can be missed. The list's one missable trophy (Positive Mental Attitude, a Chapter 1 meditation) is flagged in red wherever it appears. Around the checklist sit a five-step roadmap to the platinum built from the official descriptions — story chapters and missions first, then strangers, activities, crime and collectibles, ending with the 100% checklist — filters by kind (story, side strands, collectibles, activities, missable), grade and status, full-text search, a spoiler setting that masks unearned story trophies, and a checklist whose progress is saved in the browser and can be exported to a file and imported back. The app is plain static files under `app/` with no build step and loads nothing over the network; `main.ts` hands it in by copying `app/` and `screenshots/` to the output directory and writing `dossier.json` with the vendored make.fun library.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 — or serve app/ with any static file server

# hand the entry in the way the grader runs it:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mk8wvjdp&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
