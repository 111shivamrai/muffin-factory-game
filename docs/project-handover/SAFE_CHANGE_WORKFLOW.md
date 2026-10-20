# 🔒 Safe Change Workflow

Every developer, pair programmer, or AI coding assistant MUST follow this 14-step checklist before making and committing any changes to the Muffin Factory Game repository.

---

## The 14-Step Safe Change Checklist

1. **Step 1: Read the Handover Docs First**  
   Read `README.md` and `OWNER_REQUIREMENTS_AND_NON_NEGOTIABLES.md` before taking action.
2. **Step 2: Inspect Git Status & Branch**  
   Run `git status` and ensure you are working on a clean branch branched from `main`.
3. **Step 3: Fetch the Latest Remote State**  
   Run `git fetch origin` to ensure no out-of-sync commits exist.
4. **Step 4: Read Target Source Files in Full**  
   Do not guess function names or prop signatures. Read the exact implementation file.
5. **Step 5: Trace Invariants & Dependencies**  
   Identify whether the proposed change affects the deterministic simulation loop (`engine.ts`), WebSocket events (`socketHandler.ts`), or visual styling (`FactoryVisualization.css`).
6. **Step 6: Minimize the Modification Surface**  
   Change only the lines strictly required to satisfy the user prompt. Never bundle refactorings or cosmetic cleanups into unrelated tasks.
7. **Step 7: Check Visual Assets for UI Tasks**  
   Consult `docs/project-handover/assets/` to ensure visual layout matches the canonical standard (`dashboard_reference_image2_truth.png`).
8. **Step 8: Preserve Working Mechanics**  
   Ensure formulas for capacity, bottleneck determination, material consumption, contract penalties, holding cost, and academic grading remain completely untouched unless requested.
9. **Step 9: Run Automated Unit Tests**  
   Run `npm --prefix backend test`. All 14 tests must pass. If adding new simulation logic, write a corresponding test in `engine.test.ts`.
10. **Step 10: Run Production Builds**  
    Execute `npm --prefix backend run build` and `npm --prefix frontend run build`. Both must succeed with code 0.
11. **Step 11: Inspect the Git Diff**  
    Run `git diff` and verify that every changed line was intentional and no unwanted files (e.g. logs, temp files) were modified.
12. **Step 12: Ensure Zero Secret Leaks**  
    Verify that no `.env`, passwords, or auth tokens are staged for commit.
13. **Step 13: Craft Conventional Commit Message**  
    Commit with clear scope (e.g., `fix(ui): ...`, `feat(analytics): ...`).
14. **Step 14: Report Factual Results to the Owner**  
    State the exact files changed, tests executed, commit hash, and verification results. Do not stop at a plan.
