# ✅ Testing & Release Checklist

Follow this checklist before pushing any commits or releasing new code to production.

---

## 1. Automated Test Suites
```bash
# Run backend Jest unit tests
npm --prefix backend test
```
**Acceptance Criteria:**
- 14/14 tests pass.
- Zero snapshot errors.
- Test time < 2 seconds.

---

## 2. Production Build Verification
```bash
# 1. Backend TypeScript compilation
npm --prefix backend run build

# 2. Frontend Vite production build
npm --prefix frontend run build
```
**Acceptance Criteria:**
- Backend exits with code 0 (`tsc`).
- Frontend exits with code 0 (`tsc && vite build`).
- `frontend/dist/index.html` and bundled assets generated cleanly.

---

## 3. UI Responsive Layout Checklist
Test the frontend across standard desktop and laptop screen resolutions:

- [ ] **1920 × 1080 (FHD Desktop):** Factory scene expands up to 380px; 4 cards render at 105px; zero vertical page scrollbar.
- [ ] **1440 × 900 (MacBook Air / Pro):** Factory scene renders at ~305px height; cards render at 100px–105px; exactly matches `dashboard_reference_image2_truth.png`.
- [ ] **1366 × 768 (Standard PC Laptop):** Factory scene scales proportionally to ~230px–250px; cards remain fully visible without cutting off; no page scrollbar.
- [ ] **1280 × 720 (720p Display):** Factory scene dynamically adjusts; full dashboard fits inside viewport budget.

---

## 4. Visual Integrity Audit
- [ ] Factory scene maintains `aspect-ratio: 2.4` (conveyor art is never cropped or squashed).
- [ ] Four report cards present clear labels, gradient icon containers, and action links.
- [ ] Raw material steppers operate smoothly with `[-]` and `[+]` buttons.
- [ ] Factory Floor Operations modal displays machines in single-column vertical order (Mixer $\rightarrow$ Oven $\rightarrow$ Icing $\rightarrow$ Packaging).

---

## 5. Security & Git Audit
- [ ] No `.env` files with secret keys committed.
- [ ] No console errors or unhandled promise rejections in browser dev tools.
- [ ] Working tree clean before committing (`git status`).
- [ ] Push verified on GitHub (`git push origin main`).
