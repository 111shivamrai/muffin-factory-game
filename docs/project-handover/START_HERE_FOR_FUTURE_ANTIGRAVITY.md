# 🎯 Start Here for Future Antigravity Sessions

> **Audience:** Any fresh Antigravity agent or developer taking over this project after MacBook data reset or development pause.
> **Context:** The owner will return with a MacBook M2, provide the repo and website links, and request specific tasks. Do not expect old conversation transcripts to carry over.

---

## The 5-Step Operational Protocol

### Step 1: Read the Critical Handover Documentation
Before proposing or making any changes, read the actual files in `docs/project-handover/`:
1. `README.md`
2. `OWNER_REQUIREMENTS_AND_NON_NEGOTIABLES.md`
3. `GAME_LOGIC_AND_INVARIANTS.md`
4. `FEATURES_AND_UI_MAP.md`
5. `CURRENT_STATE_AND_KNOWN_ISSUES.md`

Do NOT skim or assume you remember the code from weights. Inspect the real files in the repository.

---

### Step 2: Inspect the Local Repository State
Verify your working directory and git state immediately:
```bash
git status
git branch -a
git log -3 --oneline
```
Ensure you are on `main`, the tree is clean, and you have fetched the latest remote changes (`git fetch origin`).

---

### Step 3: Run the Existing Verification Suite
Check that the baseline builds and passes all tests before touching anything:
```bash
# Backend unit tests & build
npm --prefix backend test
npm --prefix backend run build

# Frontend build
npm --prefix frontend run build
```
All 14 backend Jest tests must pass (`14/14 passed`). The frontend build must succeed without TypeScript or Vite errors.

---

### Step 4: Review the Owner's Request
When the owner provides a prompt:
1. **Scope Restriction:** Identify the exact requested change. Do NOT touch any file, formula, or layout element outside that scope.
2. **Read Before Writing:** Open and read the target source files in `frontend/src/` or `backend/src/`. Understand the state flow, props, and dependencies.
3. **Check Visual References:** If the task involves UI, check `docs/project-handover/assets/` to see the canonical visual targets (e.g. `dashboard_reference_image2_truth.png`).
4. **Preserve Working Mechanics:** Remember that the game simulation runs on a deterministic tick loop in `backend/src/simulation/engine.ts`. Never alter equations or state structures unless requested.

---

### Step 5: Implement, Verify, and Report Concretely
Follow the owner's preferred working style:
1. Make targeted, minimal edits.
2. Re-run `npm --prefix backend test` and both builds.
3. Check responsive layouts across viewports (1280x720, 1366x768, 1440x900, 1920x1080).
4. Stage, commit, and push with clean, conventional commit messages.
5. In your response to the owner, provide factual results: files changed, tests passed, commit hash, and verification status. Never just say "I have a plan" or "it should work". Implement it and report actual facts.
