# Roadmap

The current app is a fully functional prototype for guided CCC entrustment decisions. Every architectural choice was made to leave room for the real version. This document names what comes next and how it connects to what already exists.

## Where this is headed

The tool today is the **decision surface**. The decision surface is most valuable when it is connected — to the data that should inform it, to the narrative that should summarize it, and to the learner whose growth it shapes. The three arcs below are the next layers.

---

## Arc 1 — Data connectors

**The vision:** when the committee opens an EPA, the data that should inform the call is already there — pulled in live from the program's assessment platform, supplemented by any other source the program uses.

**Where it hooks in today:**
- `epaData` state in `src/App.jsx` already carries per-EPA notes, pre-filled levels, and deep-dive flags. A connector would populate a read-only **"Data snapshot"** section alongside the existing fields.
- The prior-cycle sidebar (currently fed from `localStorage`) is the same rendering surface — just swap the data source.
- EPAs are keyed by stable `id`, so incoming data can be mapped to EPAs without UI changes.

**What it needs:**
- Institutional integration partners (MedHub, New Innovations, homegrown systems)
- An adapter layer that normalizes incoming data into a shared shape
- User-visible provenance ("This observation came from Rotation X, Rater Y, on Date Z")

**Design principles:**
- Raw data stays visible — never hidden behind an AI summary
- Committee reasoning stays the product — the connector surfaces signal, it does not make the call
- Privacy stays local — if the source system can return data without routing through a server, it should

---

## Arc 2 — NLP-assisted narrative synthesis

**The vision:** large volumes of narrative data (MSF comments, rotation evaluations, direct observations) are synthesized into the draft story the committee refines. The learner's strengths and growth edges are surfaced automatically for the committee to accept, edit, or reject.

**Where it hooks in today:**
- The cross-cutting themes UI (`strengths` + `growth` text areas, pinned to every EPA screen) is literally the slot where an NLP-generated draft would land.
- The "Using Data Wisely" primer already frames this as the committee's job: *"listen for the story the data is telling."* NLP assists that listening, it does not replace it.
- Each EPA decision screen has per-step notes fields — also good targets for AI-drafted rationales the committee can accept or rewrite.

**What it needs:**
- A summarization model (fine-tuned or prompt-engineered) that understands the CBME vocabulary
- A UI pattern for "AI draft vs. committee edit" — probably a side-by-side diff or an accept/reject flow
- Auditability: every AI-generated synthesis should be reviewable and overrideable

**Design principles:**
- The committee's word beats the AI's word, always
- The AI never *decides* — it proposes
- Every AI contribution is labeled as such in the export

---

## Arc 3 — Cross-EPA influence (research arc)

**The vision:** data collected in the context of one EPA is known to inform others. A communication gap noted during EPA 1 (preventative care) tells you something about EPA 10 (interprofessional teams) and EPA 8 (handovers). Today that translation is implicit and held only in committee members' heads. This arc makes it **explicit, documented, and studyable**.

**Three layers of mapping:**

1. **Theoretical mapping** — expert consensus on which EPAs share core competencies (e.g., the communication domain spans 1, 4, 8, 10). Produces a weighted graph of inter-EPA influence based on the framework.

2. **Narrative mapping** — natural language analysis of committee rationales across thousands of decisions. Where reviewers cite evidence from one EPA when deciding another, record the edge. Produces an empirical graph of *actual* cross-EPA reasoning.

3. **Quantitative mapping** — statistical correlations between entrustment-level trajectories across EPAs within individual learners. Produces a graph of *outcome-level* co-movement.

**Convergence:** where the three maps agree, the inter-EPA influence is robust. Where they disagree, the disagreement is itself a finding worth studying.

**Where it hooks in today:**
- The cross-cutting themes banner (strengths + growth pinned above every EPA screen) is the **runtime surface** of this influence — the committee is already applying cross-EPA reasoning every time they consult that banner while deciding.
- The Data Primer's "Cross-EPA Translation" card is where the user-facing framing lives. As the research matures, the copy on that card can deepen.
- Every exported assessment (Excel, PDF) includes the full rationale trail — the corpus for the narrative mapping layer.

**Design principles:**
- The cross-EPA influence map should be *visible* to the committee, not just hidden inference
- The committee's real-time attribution ("this EPA 3 decision is also influenced by what we saw in EPA 8") should be capturable as structured data
- Research-grade data collection should be a byproduct of normal use, never extra work

---

## What the current prototype already proves

- A committee can walk through the full Chen-scale algorithm without knowing it in advance, and learn it as they go.
- Teaching content can collapse once reviewers prove competence — the tool grows with its user.
- Committee reasoning can be documented in a structured-enough way to be exported, re-imported, and mapped to future cycles.
- Pre-filled levels are dangerous and should require active affirmation with documented shared rationale.
- The EBM parallel (synthesis, not verdict) is the right mental model — the UI makes it visible.

## What needs a real program to prove

- Whether connector-fed data actually reduces cognitive load in meetings
- Whether NLP-assisted synthesis holds up when committees push back against it
- Whether the cross-EPA influence maps, once surfaced, shift decision-making in meaningful ways
- Whether trainees who review their assignments with coaches using this documentation achieve faster, more targeted growth — potentially enabling a 2-year competency-based graduation path for subspecialists

That last one is the north star.

---

*This document is intentionally aspirational. It is not a commitment. It is a map so collaborators can see where each piece of the prototype is meant to grow.*
