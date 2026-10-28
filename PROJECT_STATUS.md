# 🧁 Muffin Factory Game — Project Status & Knowledge Recovery

> **Current Status:** ✅ **FULLY RESTORED & VERIFIED**  
> **Last Verification Date:** October 28, 2026  
> **Baseline Commit:** `777901c51a556d60bd56cb8cb0ab1c2e12e9edf3` (`main`)  
> **Founders:** Shivam Rai & Arya Jain  
> **Production Live Web App:** [https://muffin-factory-game.vercel.app/](https://muffin-factory-game.vercel.app/)  
> **Backend Production Server:** [https://muffin-factory-game.onrender.com](https://muffin-factory-game.onrender.com)  
> **GitHub Repository:** [https://github.com/111shivamrai/muffin-factory-game](https://github.com/111shivamrai/muffin-factory-game)

---

## ⚡ Quick Start for Development

```bash
# 1. Ensure Node.js is in PATH (if installed in ~/.local/bin)
export PATH="/Users/shivamrai/.local/bin:$PATH"

# 2. Launch both servers in separate Terminal tabs
./START_SERVERS.sh
```

- **Player / Student Portal:** [http://localhost:3000](http://localhost:3000)
- **Instructor Dashboard:** [http://localhost:3000/instructor](http://localhost:3000/instructor) (`instructor@factory.com` / `muffin123`)
- **Super Admin Portal:** [http://localhost:3000/saas-admin](http://localhost:3000/saas-admin) (`aryajain1906@gmail.com` / `@Aryajain19`)
- **Backend Health Check:** [http://localhost:5001/health](http://localhost:5001/health)

---

## 🔍 Verification & Audit Summary

| Component | Status | Metrics / Details |
| :--- | :--- | :--- |
| **Backend Tests** | ✅ **16/16 PASS** | Jest test suite in `engine.test.ts` passed in 1.015s |
| **Backend TypeScript** | ✅ **CLEAN** | `tsc` compilation passed with zero errors |
| **Frontend Production Build** | ✅ **CLEAN** | Vite production bundle built in 2.83s |
| **Local Runtime Health** | ✅ **VERIFIED** | Port 5001 responding with `{"status":"ok"}` |
| **API & Sockets Verification** | ✅ **VERIFIED** | Auth login, room creation, scenario listing, student join working |
| **Git Working Tree** | ✅ **CLEAN** | Clean working directory synced with `origin/main` |

---

## 🛡️ Critical Non-Negotiables & Rules

1. **Working Logic Invariant:** NEVER modify `backend/src/simulation/engine.ts` equations, formulas, capacity calculations, or scoring without explicit owner authorization.
2. **Visual Truth (Image 2):** The Factory Floor Live Feed aspect ratio (`2.4`) and the 4 report cards (`100px - 105px`) must remain visually consistent with `docs/project-handover/assets/dashboard_reference_image2_truth.png`.
3. **Zero Hallucination:** Never claim a feature works without running the build, test suite, or checking runtime logs.
4. **Permanent Storage:** All project documentation and handover materials belong inside this Git repository, never in temporary or Downloads folders.

---

## 📚 Complete Project Knowledge Index

All detailed specifications, architecture diagrams, and mathematical models are located in `docs/project-handover/`:

- **[START_HERE_FOR_FUTURE_ANTIGRAVITY.md](docs/project-handover/START_HERE_FOR_FUTURE_ANTIGRAVITY.md):** The 5-step operational protocol for resuming after resets.
- **[OWNER_REQUIREMENTS_AND_NON_NEGOTIABLES.md](docs/project-handover/OWNER_REQUIREMENTS_AND_NON_NEGOTIABLES.md):** Strict constraints and founder requirements.
- **[GAME_LOGIC_AND_INVARIANTS.md](docs/project-handover/GAME_LOGIC_AND_INVARIANTS.md):** Complete mathematical formulas for bottlenecks, inventory, contracts, and scoring.
- **[ARCHITECTURE_AND_CODE_MAP.md](docs/project-handover/ARCHITECTURE_AND_CODE_MAP.md):** File-by-file module breakdown, dependencies, and risk levels.
- **[FEATURES_AND_UI_MAP.md](docs/project-handover/FEATURES_AND_UI_MAP.md):** Visual hierarchy, factory animation overlays, and 6-step scenario wizard map.
- **[DEVELOPMENT_HISTORY_AND_DECISIONS.md](docs/project-handover/DEVELOPMENT_HISTORY_AND_DECISIONS.md):** Complete chronological commit log through October 27, 2026.
- **[CURRENT_STATE_AND_KNOWN_ISSUES.md](docs/project-handover/CURRENT_STATE_AND_KNOWN_ISSUES.md):** Honest audit results, security findings, and limitations.
- **[SETUP_AND_RECOVERY.md](docs/project-handover/SETUP_AND_RECOVERY.md):** Step-by-step restoration and environment configuration.
- **[SAFE_CHANGE_WORKFLOW.md](docs/project-handover/SAFE_CHANGE_WORKFLOW.md):** 14-step checklist for making verified code modifications.
- **[TESTING_AND_RELEASE_CHECKLIST.md](docs/project-handover/TESTING_AND_RELEASE_CHECKLIST.md):** Release verification criteria.
- **[PENDING_REQUESTS_AND_FUTURE_WORK.md](docs/project-handover/PENDING_REQUESTS_AND_FUTURE_WORK.md):** Backlog and completed items log.
- **[HANDOVER_CHECKPOINT.md](docs/project-handover/HANDOVER_CHECKPOINT.md):** Cryptographic checkpoint and commit verification.
