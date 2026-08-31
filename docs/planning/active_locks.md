---
isInternal: true
type: Planning
title: Active Feature Locks
description: >
  Cross-session / cross-tool feature ownership. A session claims a feature
  here BEFORE starting it so other sessions (Antigravity, Claude Code) don't
  race the same work. Read + honour this before picking up anything.
tags:
  - planning
  - coordination
  - locks
  - swarm
section: Development
category: Planning
requiresLogin: true
---

# Active Feature Locks

> [!IMPORTANT]
> **AI Instruction — read this BEFORE starting any feature.** This repo is
> developed across **Antigravity** and **Claude Code**, which cannot see each
> other's session state — only this git repo. Claiming a feature here is the
> only way another session knows it's taken. Skipping this causes two sessions
> to build the same thing (a real race that has already happened).

## The lock protocol (fast, git-push is the mutex)

1. **Check first.** `git fetch origin` and read this file on `origin/dev`. If
   the feature — or a file area that materially overlaps it — is **held by a
   different owner** and the lock is fresh (Updated < 24h), do **NOT** start
   it. Pick another item or coordinate in the row's Notes.
2. **Claim atomically.** Add a row to the table below, commit, and push
   **immediately** to the shared branch: `git push origin <branch>:dev`.
   - If the push is **rejected** (non-fast-forward), another session pushed
     first. `git fetch` + merge, then **re-read this file**:
     - If they already claimed the same feature (their row exists) → **abandon
       your claim** (drop your row) and choose something else.
     - Otherwise re-add your row and push again. Repeat until the push
       succeeds. **The non-fast-forward rejection is the lock** — it
       guarantees only one first-writer wins.
3. **Heartbeat.** Bump your row's **Updated** timestamp on each significant
   commit for that feature, so others can tell a live lock from an abandoned
   one.
4. **Release.** When the feature is done (moved to `changelog.md` per
   AGENTS.md §7) **or** abandoned, remove your row, commit, push.
5. **Staleness.** A lock whose **Updated** is > 24h old **and** whose branch
   shows no recent commits may be reclaimed by another session — but only by
   editing the row with a `RECLAIMED <date> by <owner>: <reason>` note, never
   by silently deleting someone else's active lock.

**Scope of a lock:** name the feature AND its primary file areas so overlap is
obvious to the next reader. Two features touching disjoint areas can proceed in
parallel; overlapping areas must serialize.

## Holder identity — how to be uniquely identifiable

A lock is held by a **session**, not just a tool. Multiple Claude Code
sessions, multiple Antigravity sessions, and multiple people can run at the
same time, so `<tool>` alone is not unique. Every row therefore carries two
things — one for humans, one for uniqueness:

- **Holder** (*who* — for humans to coordinate): `<user> · <tool>/<model>`
  - `user`: your `git config user.email` (or the tool's signed-in account).
  - `tool`: `claude-code` or `antigravity`.
  - `model`: the LLM, e.g. `opus-4.8`, `gemini-3-pro`.
  - Example: `crnarendran@gmail.com · claude-code/opus-5`
- **Session** (*the uniqueness guarantee*): `<session-name>#<session-id>`
  - **`session-name` is the human-readable name of YOUR SESSION as the user
    sees it in their UI — NOT a slug you invent for the feature.** The user
    renames their sessions to things they recognise ("sanjeev-ai feature
    planning", "sanjeev-ai-batch-a-b"). Using that exact name is what lets a
    human read this table and know *which window* is holding a lock, instead
    of guessing which anonymous session is which.
    - **Claude Code** → call the session-management tool `get_session` with
      `session_id: "self"` and use its `title` verbatim.
    - **Antigravity** → the thread / session name shown in its UI.
    - **No name set?** Do not invent one. Ask the user to name the session,
      or write `unnamed-session` so it is visibly a gap rather than a
      plausible-looking lie.
  - `session-id`: short form (first 8 chars) of the **real** session id from
    the same source — `get_session("self").sessionId` in Claude Code, the
    thread id in Antigravity. Not the scratchpad path, not a guess. If the
    tool genuinely exposes no id, generate one once and reuse it for this
    session's claim, heartbeats and release.
  - Example: `sanjeev-ai feature planning#08ba0c8e`

> [!IMPORTANT]
> **One session = one Session value, across every lock it holds.** If a
> session claims three features, all three rows carry the same
> `<session-name>#<session-id>`. That is correct and deliberate: it shows at a
> glance that one window owns all three. Do **not** invent a different name
> per feature — the feature name already lives in the Feature column.
>
> If the user renames the session mid-flight, update the row's Session cell on
> your next heartbeat.

> Only the exact **Holder + Session** that claimed a lock may heartbeat or
> release it. A different session — *even the same user on the same tool* —
> must treat it as someone else's lock.

### Worked examples

| Session cell | Verdict |
|---|---|
| `sanjeev-ai feature planning#08ba0c8e` | ✅ the user's own session title + real id |
| `sanjeev-ai-batch-a-b#08d0a765` | ✅ same, a different window |
| `ar-batch-b#234a9b34` | ❌ a slug invented for the feature — tells a human nothing about *which* session |
| `chirp-emphasis-guard#ab1910b6` | ❌ feature slug, and the id is the scratchpad path rather than the session id |
| `claude-code#1` | ❌ names the tool, not the session; two windows collide |

> [!NOTE]
> **Legacy rows (pre-2026-08-29) use per-feature slugs.** If you are the
> holder of such a row — same tool, same session — correct its Session cell to
> your real session name on your next heartbeat. **Do not rewrite another
> session's row**; only its own holder may edit it (see the Holder+Session
> rule above). Rows already marked `Released:` are history — leave them.

## Active Locks

| Feature | Holder (user · tool/model) | Session (name#id) | Branch | Claimed (UTC) | Updated (UTC) | Primary areas | Notes |
|---|---|---|---|---|---|---|---|
| TN-1..TN-2, TN-4 Typed Notifications Batch A | agent@antigravity · antigravity/gemini-3.1-pro | goog-dev-3#16bf1987 | dev | 2026-08-30 | 2026-08-30 | frontend/src/App.tsx, frontend/src/contexts/ | Batch A only. Implementing typed notification provider and setError alias. No reclassification sweep yet (that's Batch B). |
| ED-14 Chirp 3 HD voice-capability guard (audio bug) | crnarendran · claude-code/opus-5 | sanjeev-ai feature planning#08ba0c8e | dev | 2026-08-28 | 2026-08-28 | functions/src/utils/ssml.ts, functions/src/agents/generator.ts, functions/src/utils/billing.ts (getTtsMetric only) | Live staging bug: Chirp 3 HD speaks punctuation names aloud when sent `<emphasis>` (reproduced 5/5, 0/5 without). **Deliberately NOT touching functions/src/agents/previewer.ts** — held by VP-1..VP-4; previewer emits no `<emphasis>` so it is unaffected. billing.ts touch is the single getTtsMetric branch. |

## Released / historical

| SD-1 + CLM-12 investigation spikes (docs only) | crnarendran@gmail.com · claude-code/sonnet-5 | clad-sanjeev-reviewer#0f65da94 | dev | 2026-08-31 | 2026-08-31 | docs/planning/backlog/script-delete-permission.md, docs/planning/backlog/character-location-management-ux.md, docs/planning/{changelog,implementation_status,features_backlog}.md | Released: SD-1 ✅ done (blast-radius inventory → spec §4). CLM-12 ⚠️ partial — code analysis done, empirical re-run BLOCKED (Gemini prepay pool depleted + no user import data), tracked in implementation_status.md, re-verify 2026-09-15. No production code, no rules changes. Pushed to dev only. Nothing left unmerged. |

| AQ-1..AQ-4 Audio Quality Gate | agent@antigravity · antigravity/gemini-3.1-pro | goog-so1#4c347bf9 | dev | 2026-08-30 | 2026-08-30 | functions/src/ | Released: implemented + jest 1 skipped locally. Wires into staging pipeline. Extracts audioProbe + live tests. |

| Feature | Holder (user · tool/model) | Session (name#id) | Branch | Claimed (UTC) | Updated (UTC) | Primary areas | Notes |
|---|---|---|---|---|---|---|---|
| PS-1..PS-5 Prod Smoke Tests: Cost & Signal | agent@antigravity · antigravity/gemini-3.1-pro | goog-so2#5c8c2116 | dev | 2026-08-30 | 2026-08-30 | .github/workflows/, e2e/ | Released: implemented separated smoke tests with deterministic checks, added 429 guard to auth helpers, updated promotion workflow SKILL.md. Pushed to dev. |
| VP-6 Voice Preview Audio Not Playing | agent@antigravity · antigravity/gemini-3.1-pro | goog-so2#5c8c2116 | dev | 2026-08-30 | 2026-08-30 | frontend/src/components/CharacterCard.tsx | Released: fixed autoplay blocked bug by dropping auto-play on generation success. vitest 161/161. |

| CT-1..CT-6 Cloud Telemetry | agent@antigravity · antigravity/gemini-3.1-pro | goog-so1#4c347bf9 | dev | 2026-08-30 | 2026-08-30 | .agents/mcp-servers/cloud-telemetry/, .idx/mcp.json, .mcp.json | Released: implemented + jest 7/7 + build clean. Fixed projectId validation, query surface, truncated large logs. Registered tools globally and in repo. |

| Global Cast Voice Preview 400 (App.tsx null scriptId) — PROD BUG | crnarendran · claude-code/sonnet-5 | sanjeev-ai-batch-a-b#08d0a765 | dev | 2026-08-29 | 2026-08-29 | frontend/src/App.tsx, functions/src/agents/previewer.ts | Released: implemented + jest 308/308 (1 new) + vitest 160/160 (1 new) + both builds clean + eslint 0 real errors, pushed to `dev` only (no staging/main, no force-push). Archived to changelog.md. |
| TH-1, TH-2, TH-3, TH-4 Thumbnail Loop & Publish Reliability (PROD BUG) | crnarendran · claude-code/sonnet-5 | sanjeev-ai-batch-a-b#08d0a765 | dev | 2026-08-29 | 2026-08-29 | frontend/src/pages/UnifiedStudio.tsx, frontend/src/features/studio/hooks/usePublishing.ts, frontend/src/features/studio/ui/PublishModal.tsx, functions/src/agents/publisher.ts | Released: implemented + jest 297/297 (9 new) + vitest 151/151 (15 new) + all builds clean (frontend/functions/shared) + eslint 0 real errors, pushed to `dev` only (no staging/main, no force-push, per instruction). Archived to changelog.md. |
| YT-1..YT-6 YouTube OAuth Connect & Refresh repair | agent@antigravity · antigravity/pro | goog dev 3#16bf1987 | dev | 2026-08-29 | 2026-08-29 | frontend/src/lib/youtubeOAuth.ts, frontend/src/features/studio/ui/WorkflowStepper.tsx, frontend/src/pages/Integrations.tsx, functions/src/agents/publisher/oauthCallback.ts | Released: landed on `dev` |

| AR-3, AR-4, AR-5, AR-6 Audio Review Loop Batch B | agent@antigravity · antigravity/pro | ar-batch-b#234a9b34 | dev | 2026-08-27 22:26 | 2026-08-29 | functions/src/agents/deliveryDirector.ts, frontend/src/components/ScriptTimeline.tsx, frontend/src/pages/UnifiedStudio.tsx | Released: pushed to `feat/ar-batch-b` branch |

| ML-2, ML-4, ML-9 Scriptwriter | agent@antigravity · antigravity/pro | scriptwriter#5c4a3233 | dev | 2026-08-26 23:10 | 2026-08-26 23:10 | frontend/src/features/studio/ui/ScriptReviewModal.tsx, functions/src/agents/scriptwriter.ts | RECLAIMED 2026-08-29 by crnarendran/claude-code/sonnet-5: work was actually completed and merged (`7448b18`, 2026-08-26) but this lock row was never released — confirmed via `features_backlog.md` ("ML-2/ML-4/ML-9 ... is DONE"), both files existing on `dev`, and jest 5/5 green. `multi-language-multi-format-publishing.md`'s Status column for all three stories (previously still `⬜ Todo` despite being done) was already corrected during the 2026-08-29 changelog.md repair. Moved here as Released rather than left Active. |
| Voice Preview follow-ups: cloned-voice support + changelog.md repair | crnarendran · claude-code/sonnet-5 | voice-preview-followups#32a74b06 | dev | 2026-08-29 | 2026-08-29 | functions/src/agents/previewer.ts, functions/src/utils/billing.ts, frontend/src/components/CharacterCard.tsx, docs/planning/changelog.md | Released: implemented + jest 294/294 (6 new) + vitest 136/136 (3 new) + both builds clean + eslint 0 errors, pushed to `dev`. Archived to changelog.md. Not yet promoted to staging. |
| VP-1, VP-2, VP-3, VP-4 Voice Preview cost & caching | crnarendran · claude-code/sonnet-5 | voice-preview-cost-caching#32a74b06 | dev | 2026-08-27 | 2026-08-27 | functions/src/agents/previewer.ts, functions/src/agents/importer.ts, frontend/src/components/CharacterCard.tsx, frontend/src/components/CastTab.tsx, frontend/src/components/CharacterManager.tsx, frontend/src/components/VoiceCompareButton.tsx | Released: implemented + jest 276/276 (8 new) + vitest 133/133 (6 new) + both builds clean + eslint 0 errors, pushed to `dev`. Archived to changelog.md. Not yet promoted to staging. |

| AR-0, AR-1, AR-2 Audio Review Loop | agent@antigravity · antigravity/pro | audio-review-loop#16bf1987 | dev | 2026-08-27 21:58 | 2026-08-27 23:05 | frontend/src/features/studio/ui/ScriptReviewModal.tsx, frontend/src/components/ScriptTimeline.tsx, frontend/src/pages/UnifiedStudio.tsx | Released: implemented + E2E pending, pushed to `dev`. |
| Multi-Language & Multi-Format — Phase 1a-1 (ML-1, ML-5, ML-8) | crnarendran@gmail.com · claude-code/opus-5 | ml-phase1a-1#858bd10d | ml-phase1a-1 → dev | 2026-08-24 | 2026-08-24 | frontend/src/lib/language.ts, frontend/src/features/dashboard/createProject.ts, frontend/src/features/projects/ui/ProjectSettingsModal.tsx, frontend/src/pages/Dashboard.tsx, frontend/src/lib/voiceRecommendation.ts, functions/src/utils/language.ts, functions/src/prompts/geminiTtsStyle.ts, functions/src/prompts/metadata.ts, functions/src/agents/generator.ts, functions/src/agents/metadata.ts | Released: implemented + vitest 127/127 + jest 263/263 + both builds clean + eslint 0 errors, pushed to `dev` (408ad1f, 57f40da, 66c2f2d). Archived to changelog.md. Also fixed the lint-staged v17 frontend task that had blocked all frontend/src commits since 37fcf12 (9d745bd). Not yet promoted to staging. |
| Fix stale video_draft selection race | crnarendran · claude-code/sonnet-5 | fix-draft-selection-race#32a74b06 | dev → staging | 2026-08-23 | 2026-08-23 | frontend/src/features/studio/hooks/useStudioData.ts, frontend/e2e/live-generation.spec.ts | Released: implemented + vitest 89/89 + build clean + eslint 0 errors, promoted to staging (`ec30d3b`) — full pipeline + live E2E gate green. Archived to changelog.md. Prod promotion not yet requested. |
| Voice Selection Guidance (VG-1/2/3) | crnarendran · claude-code/sonnet-5 | voice-selection-guidance#6da0d793 | dev | 2026-08-22 | 2026-08-22 | frontend/src/lib/voiceRecommendation.ts, frontend/src/components/CharacterCard.tsx, frontend/src/components/VoiceCompareButton.tsx, frontend/src/components/CastTab.tsx | Released: implemented + vitest 87/87 + build clean, pushed to `dev`. Frontend-only, no TTS-pipeline change. Not yet promoted to staging. |
| Expressive Delivery — Director placement fix (ED-9/10/12/13) | crnarendran · claude-code/sonnet-5 | expressive-delivery-lazy#4229483d | dev | 2026-08-22 | 2026-08-22 | functions/src/agents/deliveryDirector.ts, functions/src/agents/parser.ts, functions/src/agents/generator.ts, functions/src/index.ts, frontend/src/components/ScriptTimeline.tsx, frontend/src/features/studio/hooks/useStudioProcesses.ts, frontend/e2e/live-generation.spec.ts | Released: implemented + jest 249/249 + vitest 65/65 + both builds clean, pushed to `dev`. E2E fix (ED-13) not verified by a local run — that spec is gated to live staging only; verification happens on the next staging CI run. Not yet promoted to staging. |
| Expressive Delivery Engine — Batch C (ED-7) | crnarendran · claude-code/sonnet-5 | expressive-delivery-c#15a37672 | dev | 2026-08-22 | 2026-08-22 | frontend/src/components/DeliveryChips.tsx, frontend/src/components/ScriptTimeline.tsx, frontend/src/types/delivery.ts, frontend/src/pages/UnifiedStudio.tsx | Released: implemented + vitest 60/60 + build clean, pushed to `dev`. All 3 batches of the Expressive Delivery Engine now complete — archived to changelog.md. Not yet promoted to staging. |
| Expressive Delivery Engine — Batch B (ED-4/ED-5/ED-6) | crnarendran · claude-code/sonnet-5 | expressive-delivery-b#95f790b9 | dev | 2026-08-22 | 2026-08-22 | functions/src/agents/generator.ts, functions/src/agents/geminiTtsRenderer.ts, functions/src/utils/ssml.ts, functions/src/utils/wav.ts, functions/src/utils/billing.ts, functions/src/prompts/geminiTtsStyle.ts, functions/src/types/delivery.ts | Released: implemented + jest 242/242 + build clean, pushed to `dev`. Changes the vibeMap cache hash formula (now includes delivery+engine) — a one-time full regen of existing scripts' audio on next generate, expected. Batch C (ED-7 UI) is separate future work — claim a fresh lock before picking it up. |
| Expressive Delivery Engine — Batch A (ED-1/ED-2/ED-3) | crnarendran · claude-code/sonnet-5 | expressive-delivery-a#ab02d7aa | dev | 2026-08-22 | 2026-08-22 | functions/src/types/delivery.ts, functions/src/utils/delivery.ts, functions/src/prompts/deliveryDirector.ts, functions/src/agents/parser.ts, functions/src/agents/generator.ts | Released: implemented + jest 209/209 + build clean, pushed to `dev`. Batch B (ED-4/5/6 renderers, `functions/src/agents/generator.ts` prosody/SSML) and Batch C (ED-7 UI) are separate future work — claim a fresh lock before picking them up. |
| PROD BUGFIX — SSML escaping in TTS | crnarendran · claude-code/opus-5 | ssml-escape#ab1910b6 | dev → staging | 2026-08-22 | 2026-08-22 | functions/src/utils/ssml.ts, functions/src/agents/generator.ts, functions/src/agents/previewer.ts | Released: deployed to staging (`c3a6722`). Prod promotion + re-run of script `XKoOtCjhME1cavS3Pktq` still pending user go — see implementation_status.md. |
| Character & Location Management UX (Batch C) | agent@antigravity · antigravity/pro | char-loc-ux-c#616a9247 | dev | 2026-07-30 08:52 | 2026-08-09 09:44 | frontend/src/components, frontend/src/utils, functions/src/agents | Released: Deployed to staging & Retro Completed |
| Character & Location Management UX (Batch B) | agent@antigravity · antigravity/pro | char-loc-ux-b#616a9247 | dev | 2026-07-28 22:31 | 2026-07-30 08:52 | frontend/src/components, frontend/src/utils, functions/src/agents | Released: Implemented and Reviewer Signed Off |
| Character & Location Management UX (Batch A) | agent@antigravity · antigravity/pro | char-loc-ux-a#616a9247 | dev | 2026-07-28 22:31 | 2026-07-28 22:31 | frontend/src/components, frontend/src/utils, functions/src/agents | Released: Implemented |
| Paste Reference Image | agent@antigravity · antigravity/pro | image-paste#616a9247 | dev | 2026-07-28 22:51 | 2026-07-28 23:31 | frontend/src/components, frontend/src/utils | Released: Deployed to staging |
| Character Manager UI | agent@antigravity · antigravity/pro | char-manager#616a9247 | dev | 2026-07-27 12:49 | 2026-07-27 13:00 | frontend/src/components, functions/src/agents | Released: Blocked on Chirp 3 access |

(Move rows here — or delete them — when a feature lands or is abandoned. Kept
briefly for traceability, then pruned.)
|   D o c s - P o r t a l   F i x e s   ( L o g i n   +   S i d e b a r )   |   a g e n t @ a n t i g r a v i t y   -   a n t i g r a v i t y / p r o   |   d o c s - p o r t a l - f i x e s # 1 6 b f 1 9 8 7   |   d e v   |   2 0 2 6 - 0 8 - 3 1   1 9 : 1 0   |   2 0 2 6 - 0 8 - 3 1   1 9 : 1 0   |   s r c / a p p / l o g i n / p a g e . t s x ,   A u t h G u a r d . t s x ,   S i d e b a r . t s x ,   l a y o u t . t s x   |   A c t i v e   |  
 