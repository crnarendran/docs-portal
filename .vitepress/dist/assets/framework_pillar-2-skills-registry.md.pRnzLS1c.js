import{_ as n,o as a,c as i,a0 as t}from"./chunks/framework.Bmhw_dvp.js";const g=JSON.parse('{"title":"Pillar 2: The Skills Registry","description":"Component of the Agentic Development Framework documentation.","frontmatter":{"type":"Agentic Development Framework","title":"Pillar 2: The Skills Registry","description":"Component of the Agentic Development Framework documentation.","tags":["framework","internal"],"isInternal":true},"headers":[],"relativePath":"framework/pillar-2-skills-registry.md","filePath":"framework/pillar-2-skills-registry.md"}'),e={name:"framework/pillar-2-skills-registry.md"};function l(p,s,o,r,d,h){return a(),i("div",null,[...s[0]||(s[0]=[t(`<h3 id="pillar-2-the-skills-registry" tabindex="-1">Pillar 2: The Skills Registry <a class="header-anchor" href="#pillar-2-the-skills-registry" aria-label="Permalink to &quot;Pillar 2: The Skills Registry&quot;">​</a></h3><p><strong>Purpose:</strong> A structured library of domain-specific knowledge files that agents read on-demand before performing specialised tasks.</p><p><strong>Location:</strong> <code>.agents/skills/&lt;skill-name&gt;/SKILL.md</code></p><p><strong>Structure Convention:</strong></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>.agents/</span></span>
<span class="line"><span>├── skills/</span></span>
<span class="line"><span>│   ├── developing-genkit-js/</span></span>
<span class="line"><span>│   │   └── SKILL.md          # YAML frontmatter + detailed instructions</span></span>
<span class="line"><span>│   ├── firebase-security-rules-auditor/</span></span>
<span class="line"><span>│   │   └── SKILL.md</span></span>
<span class="line"><span>│   ├── e2e-testing-playwright/</span></span>
<span class="line"><span>│   │   └── SKILL.md</span></span>
<span class="line"><span>│   ├── self-updating-memory/</span></span>
<span class="line"><span>│   │   └── SKILL.md</span></span>
<span class="line"><span>│   ├── architect-planning-framework/</span></span>
<span class="line"><span>│   │   └── SKILL.md</span></span>
<span class="line"><span>│   ├── role-builder-workflow/</span></span>
<span class="line"><span>│   │   └── SKILL.md</span></span>
<span class="line"><span>│   └── role-reviewer-workflow/</span></span>
<span class="line"><span>│       └── SKILL.md</span></span>
<span class="line"><span>└── mcp-servers/</span></span>
<span class="line"><span>    └── cloud-telemetry/</span></span>
<span class="line"><span>        └── src/index.ts       # Custom MCP tools</span></span></code></pre></div><p><strong>SKILL.md Format:</strong></p><div class="language-markdown vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">markdown</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">---</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">name: e2e-testing-playwright</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">description: Guardrails for writing reliable Playwright E2E tests.</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">---</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;"># E2E Testing with Playwright — Best Practices</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Purpose</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">This skill prevents agents from writing flaky tests.</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 1. Locator Selection Rules</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Concrete rules with ❌ WRONG / ✅ CORRECT code examples]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 2. Mock Data Integrity</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Rules about relational foreign keys in test fixtures]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## 3. Race Condition Mitigation</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Timing rules for React re-renders and Cloud Function triggers]</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-light-font-weight:bold;--shiki-dark:#79B8FF;--shiki-dark-font-weight:bold;">## Troubleshooting</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[Appended automatically by the /learn workflow]</span></span></code></pre></div><div class="tip custom-block github-alert"><p class="custom-block-title">TIP</p><p><strong>The Folder Convention Matters.</strong> Flat <code>.md</code> files (e.g., <code>skills/my-skill.md</code>) are not auto-discovered by most IDE skill indexers. Always use the <code>folder-name/SKILL.md</code> paradigm with YAML frontmatter containing <code>name</code> and <code>description</code> fields.</p></div><p><strong>Key Design Decision: Skills vs. Documentation</strong></p><table tabindex="0"><thead><tr><th>Attribute</th><th>Skill (<code>.agents/skills/</code>)</th><th>Documentation (<code>docs/</code>)</th></tr></thead><tbody><tr><td><strong>Audience</strong></td><td>AI agents (machine-readable)</td><td>Humans and agents (human-readable)</td></tr><tr><td><strong>Tone</strong></td><td>Imperative (&quot;You MUST…&quot;, &quot;Do NOT…&quot;)</td><td>Descriptive (&quot;We use…&quot;, &quot;This supports…&quot;)</td></tr><tr><td><strong>Structure</strong></td><td>❌ WRONG / ✅ CORRECT code examples</td><td>Prose with optional code snippets</td></tr><tr><td><strong>Maintenance</strong></td><td>Updated by <code>/learn</code> workflow</td><td>Updated manually or by planning reviews</td></tr></tbody></table><hr>`,11)])])}const k=n(e,[["render",l]]);export{g as __pageData,k as default};
