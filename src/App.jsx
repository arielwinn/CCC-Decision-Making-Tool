import { useState, useCallback, useMemo, useEffect } from 'react';
import { EPAS, LEVELS, FOOTNOTE, framingQuestion } from './data';
import './App.css';

const isIntern = (pgy) => pgy === 'PGY-1';
const isJuniorLearner = (pgy) => pgy === 'PGY-1' || pgy === 'PGY-2';
const isSenior = (pgy) => pgy === 'PGY-3' || pgy === 'PGY-4+';

const newEpaData = () => {
  const d = {};
  EPAS.forEach(
    (e) =>
      (d[e.id] = {
        level: null,
        preFilled: false,
        needsDeepDive: false,
        notes: { is5: '', is2: '', is4: '', is3: '' },
      })
  );
  return d;
};

export default function App() {
  const [screen, setScreen] = useState('landing');
  // mode removed — the form defaults ("Test Resident", PGY-3, today's date,
  // Test CCC Member) make it trivial to explore the tool without entering
  // fake data, and no assessment is persisted until the user explicitly
  // clicks Finalize. A separate Demo Mode was redundant.
  const [trainee, setTrainee] = useState({ name: 'Test Resident', pgy: 'PGY-3', period: new Date().toISOString().slice(0, 10), chair: 'Test CCC Member' });
  // gutCheck captures the committee's holistic Q1 (overall verdict). When the
  // answer is "Yes", it forces a sub-choice between Level 4, Level 5, or
  // genuinely between — and a required rationale. That rationale is the
  // "defensible evidence" the CCC's purpose statement requires.
  const [gutCheck, setGutCheck] = useState({
    answer: null,
    overallLevel: null,      // '4' | '5' | 'between' — only relevant when answer === 'Yes'
    overallRationale: '',    // required when answer === 'Yes'
    notes: '',
  });
  const [themes, setThemes] = useState({ strengths: '', growth: '' });
  const [skipLevel2, setSkipLevel2] = useState(false);
  const [certified, setCertified] = useState(false);
  const [badges, setBadges] = useState(() => {
    try {
      const saved = localStorage.getItem('ccc-badges');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ccc-badges', JSON.stringify(badges));
    } catch {
      // ignore quota / privacy errors
    }
  }, [badges]);

  const awardBadge = useCallback((id) => {
    setBadges((b) => (b[id] ? b : { ...b, [id]: new Date().toISOString() }));
  }, []);

  // Expert mode is unlocked whenever the Practice Ready badge is held.
  useEffect(() => {
    if (badges['practice-ready']) setCertified(true);
  }, [badges]);
  const [epaIndex, setEpaIndex] = useState(0);
  const [epaStep, setEpaStep] = useState(0);
  const [epaData, setEpaData] = useState(newEpaData);
  const [history, setHistory] = useState([]);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [finalizedAt, setFinalizedAt] = useState(null); // ISO string when finalized
  const [priorCycles, setPriorCycles] = useState([]);    // loaded from localStorage on landing

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [screen, epaIndex, epaStep]);

  // Helpers for finalized-assessment persistence
  const traineeKey = (name) =>
    (name || '').trim().toLowerCase().replace(/\s+/g, '-') || 'unknown';

  const loadFinalizedFor = useCallback((name) => {
    if (!name) return [];
    try {
      const all = JSON.parse(localStorage.getItem('ccc-finalized') || '{}');
      return all[traineeKey(name)] || [];
    } catch {
      return [];
    }
  }, []);

  const saveFinalized = useCallback((snapshot) => {
    try {
      const all = JSON.parse(localStorage.getItem('ccc-finalized') || '{}');
      const key = traineeKey(snapshot.trainee.name);
      all[key] = [...(all[key] || []), snapshot];
      localStorage.setItem('ccc-finalized', JSON.stringify(all));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Unable to persist finalized assessment', e);
    }
  }, []);

  const finalize = () => {
    const stamp = new Date().toISOString();
    const snapshot = {
      finalizedAt: stamp,
      trainee,
      gutCheck,
      themes,
      epaData,
      skipLevel2,
    };
    saveFinalized(snapshot);
    setFinalizedAt(stamp);
  };

  // On landing / when the trainee name changes, reload prior cycles.
  useEffect(() => {
    if (screen === 'landing') setPriorCycles(loadFinalizedFor(trainee.name));
  }, [screen, trainee.name, loadFinalizedFor]);

  const goto = useCallback(
    (next) => {
      setHistory((h) => [...h, { screen, epaIndex, epaStep }]);
      if (next.screen !== undefined) setScreen(next.screen);
      if (next.epaIndex !== undefined) setEpaIndex(next.epaIndex);
      if (next.epaStep !== undefined) setEpaStep(next.epaStep);
    },
    [screen, epaIndex, epaStep]
  );

  const goBack = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setScreen(prev.screen);
      setEpaIndex(prev.epaIndex);
      setEpaStep(prev.epaStep);
      return h.slice(0, -1);
    });
  };

  const restart = () => {
    setScreen('landing');
    setTrainee({ name: 'Test Resident', pgy: 'PGY-3', period: new Date().toISOString().slice(0, 10), chair: 'Test CCC Member' });
    setGutCheck({ answer: null, overallLevel: null, overallRationale: '', notes: '' });
    setThemes({ strengths: '', growth: '' });
    setSkipLevel2(false);
    // Note: badges persist across restarts on purpose (training investment).
    // Keep `certified` aligned with whether the Practice-Ready badge is still held.
    setCertified(!!badges['practice-ready']);
    setEpaIndex(0);
    setEpaStep(0);
    setEpaData(newEpaData());
    setHistory([]);
    setConfirmRestart(false);
    setFinalizedAt(null);
  };

  const assignLevel = (epaId, level) =>
    setEpaData((d) => ({ ...d, [epaId]: { ...d[epaId], level, preFilled: false } }));

  const updateNote = (epaId, key, text) =>
    setEpaData((d) => ({
      ...d,
      [epaId]: { ...d[epaId], notes: { ...d[epaId].notes, [key]: text } },
    }));

  const advanceFromEpa = () => {
    goto({ screen: 'picker' });
  };

  const anyReviewed = Object.values(epaData).some((e) => e.level !== null);

  return (
    <div className="app">
      {screen !== 'landing' && (
        <Header
          screen={screen}
          epaIndex={epaIndex}
          epaStep={epaStep}
          trainee={trainee}
          certified={certified}
          canBack={history.length > 0}
          onBack={goBack}
          onRestart={() => setConfirmRestart(true)}
          onJumpSummary={anyReviewed ? () => goto({ screen: 'summary' }) : null}
        />
      )}

      <main className="main">
        {screen === 'landing' && (
          <Landing
            trainee={trainee}
            setTrainee={setTrainee}
            skipLevel2={skipLevel2}
            setSkipLevel2={setSkipLevel2}
            certified={certified}
            badges={badges}
            priorCycles={priorCycles}
            onOpenLearn={() => goto({ screen: 'learn' })}
            onStart={() => goto({ screen: 'gutcheck' })}
          />
        )}
        {screen === 'quiz' && (
          <Quiz
            onPass={() => {
              setCertified(true);
              awardBadge('practice-ready');
              goBack();
            }}
            onCancel={goBack}
          />
        )}
        {screen === 'streamlineQuiz' && (
          <StreamlineQuiz
            onPass={() => {
              awardBadge('streamline');
              goBack();
            }}
            onCancel={goBack}
          />
        )}
        {screen === 'primer' && <DataPrimer onBack={goBack} />}
        {screen === 'learn' && (
          <LearnHub
            badges={badges}
            onOpenQuiz={() => goto({ screen: 'quiz' })}
            onOpenStreamlineQuiz={() => goto({ screen: 'streamlineQuiz' })}
            onOpenPrimer={() => goto({ screen: 'primer' })}
            onBack={goBack}
          />
        )}
        {screen === 'gutcheck' && (
          <GutCheck
            gutCheck={gutCheck}
            setGutCheck={setGutCheck}
            themes={themes}
            setThemes={setThemes}
            certified={certified}
            pgy={trainee.pgy}
            onContinue={() => {
              // Yes → per-EPA affirmation grid (Level 5 affirmation only)
              // Not yet / Unsure → single pre-picker check on Level 2 (always)
              if (gutCheck.answer === 'Yes') goto({ screen: 'affirmGrid' });
              else goto({ screen: 'streamline' });
            }}
          />
        )}
        {screen === 'streamline' && (
          <StreamlineOffer
            gutCheck={gutCheck}
            setSkipLevel2={setSkipLevel2}
            onContinue={() => goto({ screen: 'picker' })}
          />
        )}
        {screen === 'affirmGrid' && (
          <AffirmGrid
            epaData={epaData}
            setEpaData={setEpaData}
            onContinueToPicker={() => goto({ screen: 'picker' })}
            onAllAffirmed={() => goto({ screen: 'summary' })}
          />
        )}
        {screen === 'picker' && (
          <EpaPicker
            epaData={epaData}
            onPick={(idx) => goto({ screen: 'epa', epaIndex: idx, epaStep: 0 })}
            onSummary={() => goto({ screen: 'summary' })}
          />
        )}
        {screen === 'epa' && (
          <>
            {(themes.strengths || themes.growth) && <ThemesBanner themes={themes} />}
            <EpaFlow
              epaIndex={epaIndex}
              epaStep={epaStep}
              epaData={epaData}
              skipLevel2={skipLevel2}
              certified={certified}
              gutCheckAnswer={gutCheck.answer}
              pgy={trainee.pgy}
              assignLevel={assignLevel}
              updateNote={updateNote}
              advanceStep={(s) => goto({ epaStep: s })}
              finish={advanceFromEpa}
            />
          </>
        )}
        {screen === 'summary' && (
          <Summary
            trainee={trainee}
            gutCheck={gutCheck}
            themes={themes}
            epaData={epaData}
            finalizedAt={finalizedAt}
            onFinalize={finalize}
            onJumpToEpa={(idx) => goto({ screen: 'epa', epaIndex: idx, epaStep: 0 })}
            onRestart={() => setConfirmRestart(true)}
          />
        )}
      </main>

      {confirmRestart && (
        <div className="modal-backdrop" onClick={() => setConfirmRestart(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Start over?</h3>
            <p>This will clear all progress. Are you sure?</p>
            <div className="button-row">
              <button className="btn-secondary" onClick={() => setConfirmRestart(false)}>Cancel</button>
              <button className="btn-danger" onClick={restart}>Yes, start over</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ screen, epaIndex, epaStep, trainee, certified, canBack, onBack, onRestart, onJumpSummary }) {
  let position = '';
  if (screen === 'gutcheck') position = 'Overall Call';
  else if (screen === 'learn') position = 'Learn';
  else if (screen === 'quiz') position = 'Knowledge Check';
  else if (screen === 'streamlineQuiz') position = 'Streamline Certification';
  else if (screen === 'primer') position = 'Using Data Wisely';
  else if (screen === 'streamline') position = 'Level 2 Check';
  else if (screen === 'affirmGrid') position = 'Affirm Level 5 by EPA';
  else if (screen === 'picker') position = 'Choose an EPA';
  else if (screen === 'epa')
    position = epaStep === 6
      ? `EPA ${EPAS[epaIndex].id} — Result`
      : `EPA ${EPAS[epaIndex].id} — Step ${epaStep + 1} of 6`;
  else if (screen === 'summary') position = 'Summary';

  const label = trainee.name || 'Assessment';

  return (
    <header className="topbar">
      <button className="btn-nav" onClick={onBack} disabled={!canBack}>← Back</button>
      <div className="topbar-center">
        <div className="topbar-label">
          {label}
          {certified && <span className="expert-badge">✓ Expert mode</span>}
        </div>
        <div className="topbar-position">{position}</div>
      </div>
      <div className="topbar-right">
        {onJumpSummary && (
          <button className="btn-nav" onClick={onJumpSummary}>Jump to Summary</button>
        )}
        <button className="btn-nav" onClick={onRestart}>Start Over</button>
      </div>
    </header>
  );
}

function Landing({ trainee, setTrainee, skipLevel2, setSkipLevel2, certified, badges, priorCycles, onOpenLearn, onStart }) {
  const earned = Object.keys(badges || {});
  const cycles = priorCycles || [];
  return (
    <div className="landing">
      <div className="landing-split">
        <div className="landing-hero reveal reveal-1">
          <div className="hero-eyebrow">CCC Entrustment Decision Tool</div>
          <h1>Pediatric EPA review,<br />one decision at a time.</h1>
          <p className="subtitle">
            A structured walkthrough for Clinical Competency Committees reviewing General Pediatrics
            entrustment decisions. Built to teach, document, and export.
          </p>

          <div className="learn-strip reveal reveal-3">
            <div className="learn-strip-meta">
              <span className="learn-strip-eyebrow">Learn Hub</span>
              <span className="learn-strip-title">Modules · Quizzes · Badges</span>
              {earned.length > 0 && (
                <span className="learn-strip-badges">
                  {earned.map((b) => <BadgePill key={b} id={b} />)}
                </span>
              )}
            </div>
            <button className="btn-ghost" onClick={onOpenLearn}>Open →</button>
          </div>
        </div>

        <div className="card elevated landing-form reveal reveal-2">
          <div className="card-eyebrow">Start a review</div>
          <h2>Who is the committee reviewing?</h2>
          <p className="landing-sub">
            Fields are pre-filled for exploring. Nothing commits until you finalize at the end.
          </p>
          <div className="form">
            <label>Trainee name<input value={trainee.name} onChange={(e) => setTrainee({ ...trainee, name: e.target.value })} /></label>
            <label>
              PGY level
              <select
                value={trainee.pgy}
                onChange={(e) => setTrainee({ ...trainee, pgy: e.target.value })}
              >
                <option value="">Select…</option>
                <option value="PGY-1">PGY-1 (intern)</option>
                <option value="PGY-2">PGY-2</option>
                <option value="PGY-3">PGY-3 (senior)</option>
                <option value="PGY-4+">PGY-4+ (chief / senior)</option>
              </select>
            </label>
            <label>Review period / date<input value={trainee.period} onChange={(e) => setTrainee({ ...trainee, period: e.target.value })} /></label>
            <label>CCC reviewer<input value={trainee.chair} onChange={(e) => setTrainee({ ...trainee, chair: e.target.value })} /></label>
          </div>
          {cycles.length > 0 && (
            <div className="prior-cycles-banner">
              <div className="prior-cycles-eyebrow">
                ✓ {cycles.length} prior {cycles.length === 1 ? 'cycle' : 'cycles'} loaded for{' '}
                {trainee.name}
              </div>
              <ul>
                {cycles.slice(-3).map((c) => (
                  <li key={c.finalizedAt}>
                    <span className="cycle-date">{new Date(c.finalizedAt).toLocaleDateString()}</span>
                    <span className="cycle-reviewer">Finalized by {c.trainee?.chair || 'Unknown reviewer'}</span>
                    <span className="cycle-gutcheck">Overall call: <strong>{c.gutCheck?.answer || '—'}</strong></span>
                  </li>
                ))}
              </ul>
              <p className="prior-cycles-note">
                Weigh them in — but new data may change the call.
              </p>
            </div>
          )}
          <button
            className="btn-primary block cta-glow"
            onClick={onStart}
            disabled={!trainee.pgy}
            title={!trainee.pgy ? 'Select a PGY level first — it shapes how the tool reasons about data sufficiency.' : undefined}
          >
            Begin Assessment →
          </button>
          {!trainee.pgy && (
            <p className="form-required-note">
              <strong>PGY level is required.</strong> The tool tailors its prompts based on the
              trainee's year — interns and seniors are read against different bars.
            </p>
          )}
        </div>
      </div>

      <div className="card settings-card">
        <div className="card-eyebrow">Program Settings</div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={skipLevel2}
            onChange={(e) => setSkipLevel2(e.target.checked)}
          />
          <span className="toggle-slider" />
          <span className="toggle-body">
            <span className="toggle-title">Skip the Level 2 question</span>
            <span className="toggle-hint">
              If your program's residents are Level 3 or higher across all EPAs (e.g. after
              intern year), skip the "does a supervisor need to be proactively in the room every
              time?" question. The algorithm will jump straight from "not practice ready" to
              asking whether they need just limited support (Level 4) or readily-available
              oversight (3A/3B).
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function GutCheck({ gutCheck, setGutCheck, themes, setThemes, certified, pgy, onContinue }) {
  // When the answer changes, reset the Yes-only sub-fields to keep state clean.
  const setAnswer = (a) => {
    if (a === 'Yes') {
      setGutCheck({ ...gutCheck, answer: a });
    } else {
      // Switching to Not yet / Unsure clears the Yes-only fields.
      setGutCheck({ ...gutCheck, answer: a, overallLevel: null, overallRationale: '' });
    }
  };

  const showInternL5 =
    gutCheck.answer === 'Yes' && gutCheck.overallLevel === '5' && isIntern(pgy);

  const canContinue = (() => {
    if (!gutCheck.answer) return false;
    if (gutCheck.answer === 'Yes') {
      if (!gutCheck.overallLevel) return false;
      if (gutCheck.overallRationale.trim().length < 10) return false;
    }
    return true;
  })();

  return (
    <div className="screen">
      <div className="gutcheck-hero">
        <div className="gutcheck-hero-eyebrow">Before we open any data</div>
        <p className="gutcheck-hero-text">
          Let's center ourselves on what this is really about:<br />
          <span className="gutcheck-hero-accent">the learner in front of us,</span><br />
          and the <span className="gutcheck-hero-accent">future patients</span> they will care for.
        </p>
      </div>
      <div className="ccc-mission">
        <div className="ccc-mission-eyebrow">The committee's job</div>
        <p className="ccc-mission-statement">
          Ensure that, by the time of graduation, we can state with confidence that each learner
          is <strong>practice ready</strong> — meaning they can enter a typical general
          pediatrics practice <em>without a supervisor assigned to oversee their care</em>, and
          the care they provide will be <em>safe and effective</em>.
        </p>
        <p className="ccc-mission-bridge">
          Before we delve into each EPA, get a sense of whether this learner is likely to be
          practice ready — or almost practice ready — as they sit today.
        </p>
      </div>

      <h2 className="question question-imagine">
        Imagine this learner entering a typical General Pediatrics practice today and caring for
        patients in that setting. Would they meet criteria for{' '}
        <em>Level 4 or 5</em>?
      </h2>
      <p className="question-followup">Definitions below.</p>

      <LevelDefinitionsCard />

      {isJuniorLearner(pgy) && (
        <div className="junior-normalizing-callout">
          <div className="junior-norm-eyebrow">A threshold, not a ceiling</div>
          <p>
            In the <strong>first 18 months of training</strong>, many residents are at Level 4
            or 5 for some EPAs — and many aren't yet. <strong>Both are okay.</strong> Level 4
            or 5 is a <em>threshold</em>, not a <em>ceiling</em>: clearing it doesn't mean
            training is done, and not clearing it doesn't mean something is wrong. The
            committee's job is to read each learner where they actually are, not against an
            expectation.
          </p>
          <p>
            Whichever way you answer, the operative work is the same:{' '}
            <strong>name what specific areas need attention</strong> if you said "Not yet," and{' '}
            <strong>confirm you have continuous data showing trajectory</strong>. A junior
            without trajectory data isn't necessarily struggling — they're invisible to us.
            That itself is something the CCC must act on.
          </p>
        </div>
      )}

      {!certified && (
        <div className="frame-banner">
          <div className="frame-banner-eyebrow">What the bar actually means</div>
          <p className="frame-banner-lead">
            Safe and effective is <strong>not</strong> expertise, and it is <strong>not</strong>
            perfection. It is also <strong>not</strong> independence — as in working alone. It
            means <strong>no one needs to be assigned to supervise this learner's care</strong> to
            ensure it is safe and effective.
          </p>
          <div className="frame-banner-divider" />
          <p className="frame-banner-kicker">That standard assumes the learner:</p>
          <ul className="frame-banner-list">
            <li><span>Knows their limits</span></li>
            <li><span>Seeks help when warranted</span></li>
            <li><span>Collaborates thoughtfully with colleagues</span></li>
            <li><span>Does so in a way that improves both care and learning</span></li>
          </ul>
          <p className="frame-banner-footer">
            — the same way every practicing physician operates.
          </p>
        </div>
      )}
      <div className="gutcheck-grid">
        <div className="gutcheck-col-left">
          <div className="gutcheck-col-header">
            <div className="gutcheck-col-eyebrow">Overall decision</div>
            <h3>Your committee's call</h3>
            <p>Pick an answer and capture the committee's brief reasoning in your own words.</p>
          </div>
          <div className="button-row gutcheck-choices">
            {['Yes', 'Not yet', 'Unsure'].map((a) => (
              <button
                key={a}
                className={`btn-choice ${gutCheck.answer === a ? 'selected' : ''}`}
                onClick={() => setAnswer(a)}
              >
                {a}
              </button>
            ))}
          </div>

          {gutCheck.answer === 'Yes' && (
            <div className="overall-yes-block reveal-soft">
              <div className="overall-yes-eyebrow">Make it specific</div>
              <p className="overall-yes-lede">
                You said the learner is overall a Level 4 or 5. Commit to which is more likely —
                the distinction matters — and document the aggregate evidence behind it.
              </p>

              <div className="overall-level-choices">
                {[
                  { key: '4', label: 'Level 4', sub: 'Limited support; supervisor not required to be readily available' },
                  { key: '5', label: 'Level 5', sub: 'Practice ready; no assigned supervision needed' },
                  { key: 'between', label: 'Between 4 & 5', sub: 'Clearly above 3B but not yet at 5' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`overall-level-choice ${gutCheck.overallLevel === opt.key ? 'selected' : ''}`}
                    onClick={() => setGutCheck({ ...gutCheck, overallLevel: opt.key })}
                  >
                    <span className="overall-level-label">{opt.label}</span>
                    <span className="overall-level-sub">{opt.sub}</span>
                  </button>
                ))}
              </div>

              <div className="overall-rationale">
                <label htmlFor="overall-rationale-text">
                  <span className="overall-rationale-label">
                    <span className="required-pill">Required</span>
                    Why do you think this learner is overall at this level?
                  </span>
                  <span className="overall-rationale-hint">
                    Name the aggregate evidence — patterns across rotations, continuity preceptor
                    voice, prior-cycle trajectory. This is the defensible rationale that anchors
                    the per-EPA decisions you're about to make.
                  </span>
                </label>
                <textarea
                  id="overall-rationale-text"
                  value={gutCheck.overallRationale}
                  onChange={(e) => setGutCheck({ ...gutCheck, overallRationale: e.target.value })}
                  rows={4}
                  placeholder="e.g. Across two rotations and continuity, preceptors describe consistently safe and effective care with appropriate help-seeking. No new concerns flagged. Prior cycle was Level 4 with trajectory upward."
                />
                {gutCheck.overallRationale.trim().length > 0 &&
                 gutCheck.overallRationale.trim().length < 10 && (
                  <p className="overall-rationale-warn">
                    A bit more specificity, please — what data supports this call?
                  </p>
                )}
              </div>

              {showInternL5 && <InternL5Callout context="overall" />}
            </div>
          )}

          <div className="gutcheck-reassurance">
            <div className="reassurance-line">
              <span className="reassurance-icon">♡</span>
              <p>
                <strong>"Not yet" is not a bad answer.</strong> It is often the most useful one —
                it helps the committee formulate a plan and name where to focus.
              </p>
            </div>
            <div className="reassurance-line">
              <span className="reassurance-icon">⊙</span>
              <p>
                <strong>This is the standard regardless of fellowship plans.</strong> Every
                learner is assessed for general pediatrics practice — where they are headed next
                does not change the bar.
              </p>
            </div>
          </div>
          <NotesArea
            label="Brief comments — what's driving that overall impression?"
            value={gutCheck.notes}
            onChange={(v) => setGutCheck({ ...gutCheck, notes: v })}
            rows={6}
          />
        </div>

        <div className="gutcheck-col-right">
          <div className="gutcheck-col-header">
            <div className="gutcheck-col-eyebrow">Cross-cutting themes</div>
            <h3>Patterns that show up across EPAs</h3>
            <p>
              These will stay pinned to the top of every EPA screen as a shared reference.
              Capture them alongside your overall decision — they often inform each other.
            </p>
          </div>

          <ComingPanel
            variant="nlp"
            icon="✦"
            title="NLP-drafted themes from narrative data"
            body="A connected program will see draft strengths and growth areas synthesized from MSF comments, rotation evaluations, and continuity-preceptor narratives — ready for the committee to accept, edit, or reject. The committee still owns the voice."
          />

          {!certified && (
            <div className="help-seeking-note compact">
              <strong>Don't overlook help-seeking.</strong> A learner who knows their limits and
              asks for help belongs on the strengths side. A learner who proceeds beyond their
              limits belongs on the growth side.
            </div>
          )}

          <div className="themes-stack">
            <div className="themes-input">
              <label>
                <span className="themes-pill strengths">Strengths</span>
                Remarkable areas that make care safe &amp; effective broadly
                <span className="themes-hint">
                  One per line. Patterns across EPAs, not one-off wins.
                </span>
              </label>
              <textarea
                value={themes.strengths}
                onChange={(e) => setThemes({ ...themes, strengths: e.target.value })}
                rows={3}
                placeholder="e.g. Seeks help appropriately when uncertain"
              />
            </div>
            <div className="themes-input">
              <label>
                <span className="themes-pill growth">Growth</span>
                Areas that currently prevent safe &amp; effective care
                <span className="themes-hint">
                  One per line. Only the ones that drop care below the threshold.
                </span>
              </label>
              <textarea
                value={themes.growth}
                onChange={(e) => setThemes({ ...themes, growth: e.target.value })}
                rows={3}
                placeholder="e.g. Proceeds beyond limits without checking in"
              />
            </div>
          </div>

          {!certified && (
            <details className="threshold-example-details">
              <summary>See examples above/below the threshold</summary>
              <div className="threshold-example">
                <div className="threshold-col">
                  <div className="threshold-col-label above">Above — not preventing safe care</div>
                  <ul>
                    <li>Communication could be more concise</li>
                    <li>Will ask for help / thoughtful consultation when needed</li>
                  </ul>
                </div>
                <div className="threshold-divider">
                  <span>Threshold for safe and effective care</span>
                </div>
                <div className="threshold-col">
                  <div className="threshold-col-label below">Below — currently prevents safe care</div>
                  <ul>
                    <li>A supervisor needs to re-explain things so the patient/caregivers can understand</li>
                    <li>Proceeds beyond limits</li>
                  </ul>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
      <p className="note">Regardless of your answer, you'll now walk through each EPA.</p>
      <button className="btn-primary" disabled={!canContinue} onClick={onContinue}>
        Continue to EPA Review
      </button>
    </div>
  );
}

const BADGE_META = {
  'practice-ready': {
    title: 'Practice Ready',
    icon: '✓',
    desc: 'Demonstrated understanding of what "practice ready" means and what the committee is (and is not) being asked to judge.',
    unlocks: 'Hides teaching callouts and level descriptors on every screen.',
  },
  'streamline': {
    title: 'Streamline',
    icon: '⚡',
    desc: 'Demonstrated competence in when and how to bulk-assign levels across EPAs responsibly.',
    unlocks: 'Offers bulk assignment paths after the overall call — Level 5 for all, baseline 3A/3B/4, or skip Level 2 across all EPAs.',
  },
};

function BadgePill({ id }) {
  const meta = BADGE_META[id];
  if (!meta) return null;
  return (
    <span className="badge-pill" title={meta.desc}>
      <span className="badge-pill-icon">{meta.icon}</span>
      {meta.title}
    </span>
  );
}

function LearnHub({ badges, onOpenQuiz, onOpenStreamlineQuiz, onOpenPrimer, onBack }) {
  const earnedCount = Object.keys(badges || {}).length;
  const modules = [
    {
      id: 'practice-ready',
      title: 'Practice Ready: The Core Concepts',
      kind: 'Module + Quiz',
      desc: 'What "practice ready" means, why it is not "expert," and the four framing reminders the committee should hold: not expert, not independent, not supervised, not impacted by fellowship plans.',
      action: onOpenQuiz,
      actionLabel: 'Take the knowledge check',
    },
    {
      id: 'data-wisely',
      title: 'Using Data Wisely',
      kind: 'Module (no quiz)',
      desc: 'How much data is enough? It depends on the story. Which sources to reach for, how to translate cross-EPA signals, and the single heuristic to ask before deciding.',
      action: onOpenPrimer,
      actionLabel: 'Open primer',
      noBadge: true,
    },
    {
      id: 'streamline',
      title: 'Streamline Certification',
      kind: 'Quiz only',
      desc: 'Prove you know when bulk assignment is safe and when it is not. Passing unlocks streamline mode after the overall call: affirm Level 5 for all, pre-fill a baseline level, or skip the Level 2 question across all EPAs.',
      action: onOpenStreamlineQuiz,
      actionLabel: 'Take streamline certification',
    },
  ];
  return (
    <div className="screen learn-hub">
      <div className="card-eyebrow">Learn Hub</div>
      <h1>Modules & Badges</h1>
      <p className="primer-lede">
        Short training modules that sharpen your judgment and — when relevant — unlock faster
        paths through the tool. Badges are saved to this browser and persist across sessions.
        You have earned <strong>{earnedCount}</strong> of <strong>{Object.keys(BADGE_META).length}</strong>.
      </p>

      <div className="primer-section">
        <h3>Your badges</h3>
        {earnedCount === 0 ? (
          <p className="note">No badges yet. Complete a module to earn your first.</p>
        ) : (
          <div className="badges-row large">
            {Object.keys(badges).map((b) => (
              <div key={b} className="badge-card">
                <div className="badge-card-icon">{BADGE_META[b]?.icon || '★'}</div>
                <div className="badge-card-title">{BADGE_META[b]?.title || b}</div>
                <div className="badge-card-desc">{BADGE_META[b]?.desc}</div>
                {BADGE_META[b]?.unlocks && (
                  <div className="badge-card-unlock"><strong>Unlocks:</strong> {BADGE_META[b].unlocks}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="primer-section">
        <h3>Available modules</h3>
        <div className="modules-list">
          {modules.map((m) => {
            const hasBadge = !m.noBadge && badges[m.id];
            return (
              <div key={m.id} className="module-card">
                <div className="module-card-header">
                  <div className="module-card-kind">{m.kind}</div>
                  {hasBadge && <span className="module-card-badge">✓ Passed</span>}
                </div>
                <h4>{m.title}</h4>
                <p>{m.desc}</p>
                <button className="btn-secondary" onClick={m.action}>
                  {hasBadge ? 'Retake' : m.actionLabel} →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="button-row">
        <button className="btn-primary" onClick={onBack}>← Back to landing</button>
      </div>
    </div>
  );
}

const QUIZ_QUESTIONS = [
  {
    q: 'A learner is "practice ready" (Level 5) for an EPA when they are…',
    opts: [
      'An expert — polished, efficient, and at the top of their game',
      'Able to deliver safe and effective care without a supervisor assigned to oversee the activity',
      'Able to handle every situation without ever needing to consult a colleague',
      'The strongest resident in their class for this EPA',
    ],
    correct: 1,
    why: 'Practice ready means safe and effective — not expert, not independent of all consultation, and not measured against peers. The bar is whether a typical general pediatrics practice would be well served by this learner tomorrow.',
  },
  {
    q: 'A Level 5 learner who routinely asks colleagues for help when they reach their limits is…',
    opts: [
      'Not actually practice ready — they need more training',
      'Demonstrating a core safety skill that every practicing physician is expected to have',
      'Showing they lack confidence',
      'Fine, as long as they ask rarely',
    ],
    correct: 1,
    why: 'Help-seeking is part of safe practice. Every practicing physician asks for consultation. A learner who knows their limits and seeks input is demonstrating good judgment, not failure.',
  },
  {
    q: 'What is the defining difference between Level 2 and Levels 3 / 4?',
    opts: [
      'Level 2 is for interns; Level 3 / 4 is for seniors',
      'Level 2 learners cannot perform the activity at all',
      'Level 2 requires a supervisor proactively assigned to be in the room every time the activity is performed; at 3 and 4, no supervisor is assigned to be in the room every time (though one could happen to be there)',
      'Level 2 means the activity has not yet been taught',
    ],
    correct: 2,
    why: 'Level 2 is about a supervisor being proactively assigned to the room. At Levels 3 and 4, a supervisor may still happen to be in the room sometimes, but not by assignment for every instance.',
  },
  {
    q: 'When deciding whether a learner is practice ready, you should consider their fellowship plans…',
    opts: [
      'Yes — residents headed to a subspecialty should be held to a lower general pediatrics standard',
      'Yes — residents staying in general pediatrics should be held to a higher standard',
      'No — every learner is assessed for general pediatrics practice regardless of what comes next',
      'Only for procedural EPAs',
    ],
    correct: 2,
    why: 'The entrustment decision is about general pediatrics practice, full stop. Fellowship plans do not change the standard or the question.',
  },
  {
    q: 'A learner who "proceeds beyond their limits without checking in" is best characterized as…',
    opts: [
      'Independent and confident — ready for Level 5',
      'Displaying a growth area that currently prevents safe and effective care',
      'Only a concern if a bad outcome has already occurred',
      'Demonstrating autonomy, which is a strength',
    ],
    correct: 1,
    why: 'Proceeding beyond one\'s limits without seeking help is a classic below-the-line pattern — it drops care below the safe and effective threshold regardless of outcomes so far.',
  },
];

// Thin wrapper — uses the same GenericQuiz renderer as StreamlineQuiz.
function Quiz({ onPass, onCancel }) {
  return (
    <GenericQuiz
      title="Practice-Ready Knowledge Check"
      lede="Answer all five correctly and the app will hide the teaching content on every screen. If you miss any, we'll show you which concepts to review and you can try again."
      questions={QUIZ_QUESTIONS}
      passMessage="The app will now hide teaching callouts and level descriptors on every screen. You can always re-take this from the Learn Hub if you want to reset."
      onPass={onPass}
      onCancel={onCancel}
    />
  );
}

const STREAMLINE_QUIZ_QUESTIONS = [
  {
    q: 'When is it appropriate to affirm Level 5 for all 12 EPAs at once?',
    opts: [
      'Whenever a senior resident is under review',
      'Whenever the committee has answered "Yes" to the overall call AND the data supports practice-readiness across the full scope of general pediatrics',
      'Whenever scheduling pressure makes per-EPA review impractical',
      "Never — every EPA must be reviewed individually regardless of the committee's overall judgment",
    ],
    correct: 1,
    why: 'Bulk affirmation is appropriate when the overall call is Yes AND the aggregate data supports practice-readiness across the breadth of general pediatrics. The committee still owns the obligation to flag any EPA that feels like an exception.',
  },
  {
    q: 'After bulk-assigning a baseline level across all EPAs, your obligation is to…',
    opts: [
      "Move on — you've documented the decision",
      'Review each EPA that the committee suspects is an exception and walk it through the full algorithm individually',
      'Review every EPA again individually to confirm',
      'Ask the trainee which EPAs to reconsider',
    ],
    correct: 1,
    why: 'Streamline is a proposal with a review step. The committee is responsible for surfacing and walking through any EPAs where the pre-filled level does not match the actual data — especially outliers, flagged concerns, or EPAs with thin data.',
  },
  {
    q: 'The difference between Level 3B ("moderate support and oversight") and Level 4 ("limited support and oversight") is best described as…',
    opts: [
      'Level 4 is for residents in their final six months only',
      'Level 4 means the supervisor does NOT need to be readily available; Level 3B means the supervisor DOES need to be readily available to provide immediate support',
      'Level 3B is for procedures; Level 4 is for cognitive EPAs',
      'There is no meaningful difference — the levels are interchangeable in practice',
    ],
    correct: 1,
    why: 'The critical distinction is supervisor availability. At Level 4, the supervisor is not required to be readily available. At 3A and 3B, the supervisor must remain readily available to provide immediate support. The 3A vs 3B gradient is about degree of oversight when available.',
  },
  {
    q: 'If the overall call is "Not yet" but the committee agrees no EPA requires a supervisor proactively assigned to the room every time, the appropriate streamline action is…',
    opts: [
      'Assign Level 2B to all EPAs as a safe default',
      'Skip the Level 2 question across all EPAs for this review — every EPA will be 3A, 3B, 4, or 5',
      'Require Level 2 review for each EPA individually anyway',
      'Escalate to the program director',
    ],
    correct: 1,
    why: 'If the committee is confident no EPA needs a proactively assigned room supervisor, the Level 2 question is not informative — skip it across all EPAs. Each EPA then moves directly into the 3/4/5 territory.',
  },
  {
    q: 'The single biggest risk of using the streamline flow is…',
    opts: [
      'Running out of time in the meeting',
      'Missing an EPA that is actually an exception because the pre-filled level felt "close enough" to the aggregate pattern',
      'The trainee objecting to the assigned level',
      'The Excel export being incomplete',
    ],
    correct: 1,
    why: 'The quiet failure mode of bulk assignment is inattention to outliers. A committee that pre-fills Level 4 and then glances at the picker may miss an EPA where the data actually points to 3A or 2B. Your job is to actively look for the exceptions — the streamline is not "done" until you have.',
  },
];

function StreamlineQuiz({ onPass, onCancel }) {
  return (
    <GenericQuiz
      title="Streamline Certification"
      lede="Pass this 5-question check and the app will unlock streamline mode: the ability to pre-fill Level 5 (or a baseline 3A/3B/4) across all EPAs at once, with a review step for exceptions. The streamline path also lets you skip the Level 2 question across all EPAs in one step."
      questions={STREAMLINE_QUIZ_QUESTIONS}
      passMessage="You passed. Streamline mode is unlocked. After the overall call, you'll be offered bulk-assignment paths you can use or decline on any given review."
      onPass={onPass}
      onCancel={onCancel}
    />
  );
}

function GenericQuiz({ title, lede, questions, passMessage, onPass, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
  const passed = correctCount === questions.length;
  return (
    <div className="screen quiz-screen">
      <div className="card-eyebrow">{title}</div>
      <h1>{title}</h1>
      <p className="quiz-lede">{lede}</p>
      <div className="quiz-questions">
        {questions.map((q, i) => {
          const userAnswer = answers[i];
          const isCorrect = userAnswer === q.correct;
          return (
            <div key={i} className={`quiz-q ${submitted ? (isCorrect ? 'correct' : 'wrong') : ''}`}>
              <div className="quiz-q-num">Question {i + 1} of {questions.length}</div>
              <h3 className="quiz-q-text">{q.q}</h3>
              <div className="quiz-options">
                {q.opts.map((o, j) => {
                  const isPicked = userAnswer === j;
                  const showCorrect = submitted && j === q.correct;
                  const showWrong = submitted && isPicked && j !== q.correct;
                  return (
                    <button
                      key={j}
                      className={`quiz-opt ${isPicked ? 'picked' : ''} ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                      onClick={() => !submitted && setAnswers({ ...answers, [i]: j })}
                      disabled={submitted}
                    >
                      <span className="quiz-opt-letter">{String.fromCharCode(65 + j)}</span>
                      <span>{o}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div className={`quiz-explain ${isCorrect ? 'correct' : 'wrong'}`}>
                  <strong>{isCorrect ? '✓ Correct.' : '✗ Not quite.'}</strong> {q.why}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!submitted && (
        <div className="button-row">
          <button className="btn-primary" disabled={!allAnswered} onClick={() => setSubmitted(true)}>Submit Answers</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      )}
      {submitted && (
        <div className="quiz-result">
          <div className={`quiz-score ${passed ? 'passed' : 'failed'}`}>{correctCount} / {questions.length} correct</div>
          {passed ? (
            <>
              <h3>You passed.</h3>
              <p>{passMessage}</p>
              <div className="button-row">
                <button className="btn-primary" onClick={onPass}>Continue →</button>
              </div>
            </>
          ) : (
            <>
              <h3>Review the concepts above and try again.</h3>
              <p>The explanations on each missed question will help.</p>
              <div className="button-row">
                <button className="btn-primary" onClick={() => { setAnswers({}); setSubmitted(false); }}>Retake</button>
                <button className="btn-secondary" onClick={onCancel}>Go back without passing</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// AffirmGrid states per EPA: 'pending' (default) | 'affirm' | 'review'
function AffirmGrid({ epaData, setEpaData, onContinueToPicker, onAllAffirmed }) {
  const [states, setStates] = useState(() => {
    const s = {};
    EPAS.forEach((e) => (s[e.id] = 'pending'));
    return s;
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkRationale, setBulkRationale] = useState('');

  const countOf = (v) => Object.values(states).filter((x) => x === v).length;
  const affirmedCount = countOf('affirm');
  const reviewCount = countOf('review');
  const pendingCount = countOf('pending');

  const setState = (id, state) =>
    setStates((s) => ({ ...s, [id]: s[id] === state ? 'pending' : state }));
  const setAll = (state) => {
    const s = {};
    EPAS.forEach((e) => (s[e.id] = state));
    setStates(s);
  };

  const commit = () => {
    const next = {};
    const rationaleText = bulkRationale.trim();
    EPAS.forEach((e) => {
      const st = states[e.id];
      const prior = epaData[e.id];
      if (st === 'affirm') {
        // Apply the bulk rationale to notes.is5 if one was provided.
        // If the EPA already had a different is5 note, preserve it by appending.
        const nextNotes = rationaleText
          ? {
              ...prior.notes,
              is5: prior.notes.is5 && prior.notes.is5 !== rationaleText
                ? `${prior.notes.is5}\n\n[Bulk affirm rationale]\n${rationaleText}`
                : rationaleText,
            }
          : prior.notes;
        next[e.id] = {
          ...prior,
          level: '5',
          preFilled: true,
          needsDeepDive: false,
          notes: nextNotes,
        };
      } else if (st === 'review') {
        // Flag for deep dive; do not assign a level. Clear any old pre-fill.
        const wasPreFilledFive = prior.preFilled && prior.level === '5';
        next[e.id] = {
          ...prior,
          level: wasPreFilledFive ? null : prior.level,
          preFilled: wasPreFilledFive ? false : prior.preFilled,
          needsDeepDive: true,
        };
      } else {
        // Pending: clear pre-filled 5s, untouched otherwise, clear deep-dive flag.
        const wasPreFilledFive = prior.preFilled && prior.level === '5';
        next[e.id] = {
          ...prior,
          level: wasPreFilledFive ? null : prior.level,
          preFilled: wasPreFilledFive ? false : prior.preFilled,
          needsDeepDive: false,
        };
      }
    });
    setEpaData(next);
    if (affirmedCount === EPAS.length) onAllAffirmed();
    else onContinueToPicker();
  };

  const unaffirmedCount = reviewCount + pendingCount;
  const continueLabel =
    affirmedCount === 0
      ? `Walk all ${unaffirmedCount} through the algorithm →`
      : affirmedCount === EPAS.length
      ? 'Affirm all 12 at Level 5 →'
      : `Commit: ${affirmedCount} at Level 5, walk ${unaffirmedCount} →`;

  return (
    <div className="screen">
      <div className="card-eyebrow">Affirm by EPA</div>
      <h1>Actively affirm Level 5 — one by one, or all at once</h1>
      <p className="intro-lede">
        You answered <strong>Yes</strong> overall. Overall Yes is a starting point — it is not an
        automatic assignment. For each EPA, the committee must <strong>actively click</strong> to
        affirm practice ready (Level 5). Any EPA left unaffirmed will be walked through the full
        algorithm on the next screen. Nothing is assigned by default.
      </p>

      <div className="affirm-toolbar">
        <div className="affirm-counts">
          <span className="affirm-count-pill affirmed">
            <strong>{affirmedCount}</strong> affirmed L5
          </span>
          <span className="affirm-count-pill deepdive">
            <strong>{reviewCount}</strong> needs deep-dive review
          </span>
          <span className="affirm-count-pill exceptions">
            <strong>{pendingCount}</strong> pending
          </span>
        </div>
        <div className="affirm-bulk">
          <button className="btn-nav affirm-all-btn" onClick={() => setAll('affirm')}>
            ✓ Affirm all
          </button>
          <button className="btn-nav review-all-btn" onClick={() => setAll('review')}>
            ⚑ Flag all for review
          </button>
          <button className="btn-nav" onClick={() => setAll('pending')}>Clear</button>
        </div>
      </div>

      <div className="affirm-grid">
        {EPAS.map((e) => {
          const st = states[e.id];
          return (
            <div key={e.id} className={`affirm-card state-${st}`}>
              <div className="affirm-card-head">
                <span className="affirm-card-num">EPA {e.id}</span>
                <span className={`verdict-tag ${st}`}>
                  {st === 'affirm' && '✓ Affirmed L5'}
                  {st === 'review' && '⚑ Deep-dive flagged'}
                  {st === 'pending' && 'Pending'}
                </span>
              </div>
              <div className="affirm-card-name">{e.short}</div>
              <div className="affirm-card-actions">
                <button
                  type="button"
                  className={`affirm-action-btn affirm ${st === 'affirm' ? 'active' : ''}`}
                  onClick={() => setState(e.id, 'affirm')}
                  aria-pressed={st === 'affirm'}
                >
                  ✓ Affirm L5
                </button>
                <button
                  type="button"
                  className={`affirm-action-btn review ${st === 'review' ? 'active' : ''}`}
                  onClick={() => setState(e.id, 'review')}
                  aria-pressed={st === 'review'}
                >
                  ⚑ Needs review
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="button-row">
        <button className="btn-primary" onClick={() => setShowConfirm(true)}>
          Review & commit →
        </button>
      </div>

      {showConfirm && (
        <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
          <div className="modal confirm-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="card-eyebrow">Confirm affirmations</div>
            <h3>Are you sure?</h3>
            <p className="confirm-sub">
              This commits the committee's affirmations. You can still re-review any EPA from the
              picker or summary.
            </p>

            <div className="confirm-summary">
              <div className="confirm-row">
                <span className="confirm-check on">✓</span>
                <div>
                  <strong>{affirmedCount}</strong>{' '}
                  {affirmedCount === 1 ? 'EPA' : 'EPAs'} will be assigned <strong>Level 5</strong>
                  {' '}(practice ready).
                </div>
              </div>
              {reviewCount > 0 && (
                <div className="confirm-row">
                  <span className="confirm-check deepdive">⚑</span>
                  <div>
                    <strong>{reviewCount}</strong>{' '}
                    {reviewCount === 1 ? 'EPA' : 'EPAs'} flagged as <strong>needing deep-dive
                    review</strong> — these will be walked through the algorithm with a deep-dive
                    callout to prompt a more thorough committee discussion.
                  </div>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="confirm-row">
                  <span className="confirm-check pending">→</span>
                  <div>
                    <strong>{pendingCount}</strong>{' '}
                    {pendingCount === 1 ? 'EPA' : 'EPAs'} still pending — will be walked through the
                    algorithm normally.
                  </div>
                </div>
              )}
            </div>

            {affirmedCount >= 2 && (
              <div className="bulk-rationale">
                <label>
                  <span className="bulk-rationale-label">
                    Document the rationale for this bulk affirmation
                  </span>
                  <span className="bulk-rationale-hint">
                    Required when affirming multiple EPAs at once. Name the shared reasoning:
                    what is the committee seeing across the aggregate data that supports Level 5
                    for <strong>{affirmedCount}</strong> EPAs? This will be saved as the
                    rationale for each of the {affirmedCount} affirmed EPAs.
                  </span>
                </label>
                <textarea
                  value={bulkRationale}
                  onChange={(e) => setBulkRationale(e.target.value)}
                  rows={4}
                  placeholder="e.g. Across the last two rotations and continuity clinic, preceptors consistently describe safe and effective care with appropriate help-seeking. No concerns flagged in MSF. Prior cycle levels were already at 3B or higher on these EPAs with trajectory upward."
                  autoFocus
                />
              </div>
            )}

            <div className="confirm-affirm-line">
              <strong>"Yes, the committee has actively affirmed the selections above."</strong>
            </div>

            <div className="button-row">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                Go back and review
              </button>
              <button
                className="btn-primary"
                disabled={affirmedCount >= 2 && bulkRationale.trim().length === 0}
                onClick={() => {
                  setShowConfirm(false);
                  commit();
                }}
              >
                {continueLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StreamlineOffer({ gutCheck, setSkipLevel2, onContinue }) {
  const [skipL2, setSkipL2] = useState(null); // null | true | false

  // Shown for Not yet and Unsure gut-check answers. Asks one orienting question
  // about Level 2 (supervisor proactively assigned to the room). No levels are
  // pre-filled — every EPA will still be walked through the algorithm.
  const answer = gutCheck.answer;
  if (answer !== 'Not yet' && answer !== 'Unsure') {
    // Defensive — routing should never land here.
    return null;
  }

  return (
    <div className="screen">
      <div className="card-eyebrow">One orienting question</div>
      <h1>Before we walk each EPA…</h1>
      <p className="intro-lede">
        You answered <strong>{answer}</strong> to the overall call. Every EPA will be walked
        through the full algorithm individually — <strong>nothing will be pre-assigned</strong>.
        The only question to settle up front is whether the committee already knows the answer
        to the Level 2 question for every EPA.
      </p>

      <div className="streamline-card">
        <h3>Skip the Level 2 question across all EPAs?</h3>
        <p>
          Across all 12 EPAs, does the committee agree that <em>no</em> EPA requires a
          supervisor <strong>proactively assigned to be in the room every time</strong> this
          trainee performs the activity? If yes, we can skip the Level 2 question on every EPA
          — you will still walk each EPA through the Level 3 / 4 / 5 decisions.
        </p>
        <p className="note">
          This does <strong>not</strong> pre-assign any level. It only skips a question the
          committee has already answered in aggregate.
        </p>
        <div className="streamline-choices">
          <button
            className={`btn-choice ${skipL2 === true ? 'selected' : ''}`}
            onClick={() => setSkipL2(true)}
          >
            Yes — skip Level 2 for all EPAs
          </button>
          <button
            className={`btn-choice ${skipL2 === false ? 'selected' : ''}`}
            onClick={() => setSkipL2(false)}
          >
            Keep the Level 2 question active
          </button>
        </div>
      </div>

      <div className="button-row">
        <button
          className="btn-primary"
          disabled={skipL2 === null}
          onClick={() => {
            if (skipL2) setSkipLevel2(true);
            onContinue();
          }}
        >
          Continue to picker →
        </button>
      </div>
    </div>
  );
}

const DATA_SOURCES = [
  {
    title: 'Continuity clinic preceptor',
    body: "A preceptor who has watched this learner across many patients and over time holds longitudinal signal that a pile of one-off observations cannot match. Their narrative often collapses weeks of ambiguous data into a single, credible story. Seek their voice — especially for EPAs that hinge on pattern recognition, relationships with families, or growth over months.",
  },
  {
    title: 'Cross-EPA translation',
    body: "Data collected in the context of one EPA almost always speaks to others. A communication gap flagged during an EPA 1 preventative visit tells you something about EPA 10 (interprofessional teams) and EPA 8 (handovers). Translate freely — the committee is trying to understand a whole learner, not a set of sealed boxes.",
  },
  {
    title: 'Prior-cycle entrustment levels and concerns',
    body: "What did this committee decide last time? What concerns were named? Your decision is a trajectory, not a point estimate. A Level 3A holding steady is a different story than a Level 3A that was a 2B last cycle, which is different still from a Level 3A that was a 4 last cycle. Movement matters.",
  },
  {
    title: 'Direct observations (MSF, EPA cards, mini-CEX)',
    body: "Structured assessments with narrative. Ratings alone are low signal; the density rises sharply when comments are specific and behavioral (what did the learner actually do?). Prioritize narrative over scores.",
  },
  {
    title: 'Rotation evaluations',
    body: "Broader perspective, often lagging, and variably specific. Useful as supporting evidence and for surfacing outliers — but rarely the primary signal. If a rotation evaluation is the only source saying something, ask whether it can be corroborated.",
  },
  {
    title: 'Trainee self-assessment',
    body: "A learner's insight into their own limits is itself data about a core safety skill — help-seeking. A learner who accurately names their growth edges is demonstrating something important. A learner who consistently over-rates themselves is flagging a concern worth surfacing.",
  },
];

function DataPrimer({ onBack }) {
  return (
    <div className="screen primer-screen">
      <div className="card-eyebrow">Using Data Wisely</div>
      <h1>How much data is enough?</h1>
      <p className="primer-answer">We don't yet know… and it depends on the story.</p>
      <p className="primer-lede">
        The entrustment decision is not a statistical calculation — it is a synthesis of what you
        have into a coherent story about <em>this</em> learner, on <em>this</em> EPA, right now.
        Some decisions will be obvious from three signals. Others will need many more. The right
        question is never "how many assessments do I have?" It is <strong>"do I have enough to
        tell the story?"</strong>
      </p>

      <div className="primer-section">
        <h3>Where to reach for data</h3>
        <div className="primer-grid">
          {DATA_SOURCES.map((s) => (
            <div key={s.title} className="primer-card-body">
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="primer-heuristic">
        <div className="card-eyebrow">The heuristic</div>
        <p>
          Before you decide, ask the committee: <strong>"Can we tell a coherent story about this
          learner for this EPA right now?"</strong>
        </p>
        <ul>
          <li>
            <strong>Yes →</strong> You have enough data. Decide.
          </li>
          <li>
            <strong>No →</strong> Name what is missing out loud, and go find it before deciding.
            "We need to hear from the continuity preceptor" is a legitimate, committee-level
            action item.
          </li>
          <li>
            <strong>Partial →</strong> Sometimes the story is clear on the strengths side and
            unclear on the growth side, or vice versa. Decide what is clear, flag what is not.
          </li>
        </ul>
      </div>

      <div className="primer-callout">
        <strong>It depends on the story, not the sample size.</strong> A single vivid observation
        from a trusted preceptor that says "I watched her calmly talk a terrified family through
        a new diabetes diagnosis for 45 minutes" may be worth more than twenty checkbox ratings.
        The committee's job is to listen for the story the data is telling — and to notice when
        the story is not yet coherent.
      </div>

      <div className="primer-section">
        <h3>A parallel to evidence-based medicine</h3>
        <div className="ebm-parallel">
          <div className="ebm-lede">
            In EBM, there is rarely a single diagnostic test that gives you the truth. You
            synthesize the history, the exam, the labs, the imaging — weighing sensitivity,
            specificity, and pretest probability — and arrive at an <em>informed judgment</em>,
            not a verdict.
          </div>
          <div className="ebm-lede emphasis">
            CCC decisions work the same way. There is no single data point that tells you what
            level a learner is. You make an informed judgment based on the available data, and
            you make your thought process <strong>transparent and documented</strong> so that
            others — including the learner — can understand how you got there.
          </div>
          <div className="ebm-pretest">
            <div className="ebm-pretest-eyebrow">Pretest probability is real — and asymmetric</div>
            <p className="ebm-pretest-lede">
              Prior-cycle levels are the pretest probability for this cycle's call. But how that
              probability behaves depends on where the learner sits on the scale — because
              <em> progress is expected</em>, and training time is finite.
            </p>

            <div className="ebm-pretest-label">Scenario A — top of the scale</div>
            <div className="ebm-scenario">
              <div className="ebm-scenario-setup">
                <span className="ebm-label">Setup</span>
                <p>
                  A trainee was assigned <strong>Level 5</strong> at the last{' '}
                  <strong>two consecutive cycles</strong>. Current data is thin.
                </p>
              </div>
              <div className="ebm-scenario-answer">
                <span className="ebm-label">Reasoning</span>
                <p>
                  Pretest probability they are still a 5? <strong>High.</strong> Competence at
                  this level, demonstrated consistently, rarely regresses without a precipitating
                  event. Thin current data is not evidence of decline — it is thin current data.
                  Absent a signal that moves you, the prior call holds.
                </p>
              </div>
              <div className="ebm-scenario-warning">
                <span className="ebm-label">Where this breaks</span>
                <p>
                  If new data contains a specific concerning signal — a missed serious diagnosis,
                  a breakdown in communication, a failure of help-seeking — the prior is
                  overridden by the likelihood ratio of the new finding. Pretest probability
                  tells the committee what the new data has to clear to change the call.
                </p>
              </div>
            </div>

            <div className="ebm-pretest-pivot">
              <span className="ebm-pretest-pivot-arrow">↓</span>
              <span>But the same "thin data" produces opposite reasoning at lower levels.</span>
            </div>

            <div className="ebm-pretest-label alt">Scenario B — mid-scale, progress expected</div>
            <div className="ebm-scenario">
              <div className="ebm-scenario-setup">
                <span className="ebm-label">Setup</span>
                <p>
                  A trainee was assigned <strong>Level 3A</strong> at the last{' '}
                  <strong>two consecutive cycles</strong>. Current data is thin.
                </p>
              </div>
              <div className="ebm-scenario-alert">
                <span className="ebm-label">Reasoning</span>
                <p>
                  "Still a 3A" is <strong>not a safe carryover</strong>. Competency-based
                  training expects trajectory. Two cycles at the same sub-practice-ready level
                  is <em>itself a signal</em> — especially with thin current data. The real
                  question is not "are they still a 3A?" but <strong>"why isn't the learner at
                  3B or higher yet, and do we have the data to know?"</strong>
                </p>
              </div>
              <div className="ebm-scenario-warning">
                <span className="ebm-label">The committee's obligation</span>
                <p>
                  At lower levels the obligation is <em>stronger</em>, not weaker, when data is
                  thin. Either seek more data (continuity preceptor, rotation director, targeted
                  observations) before deciding, or explicitly name the <strong>trajectory
                  concern</strong> in the notes. Training time is finite. A committee that
                  silently carries forward 3A without probing whether growth has actually
                  occurred is not serving the learner.
                </p>
              </div>
            </div>

            <div className="ebm-pretest-synth">
              <strong>The synthesis:</strong> pretest probability is not a rule that says
              "prior level holds." It is a rule that tells you <em>which direction new data
              has to move you</em>. At the top, the prior holds unless new evidence lowers it.
              At the middle, the prior is a starting hypothesis that progress <em>should</em>
              have already raised — and the committee's job is to find out why it hasn't.
            </div>
          </div>

          <div className="ebm-ideal">
            <div className="ebm-ideal-eyebrow">In an ideal world</div>
            <p>
              These assignments and the reasoning behind them are reviewed and finalized
              collaboratively — with the resident and their coach. The committee's best thinking
              becomes shared material the learner can act on, and the coach can translate into
              a growth plan. That closes the loop between assessment and learning.
            </p>
          </div>
        </div>
      </div>

      <div className="button-row">
        <button className="btn-primary" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}

// Subtle, animated "future capability" marker — used to hint at connected
// data, NLP synthesis, and collaborative review features that the prototype
// is architected for but has not yet shipped.
// LevelDefinitionsCard — anchors the Overall Call screen with concrete operational
// definitions of Level 5 and Level 4. The Yes-path sub-choice asks the committee
// to commit to one of these, so the definitions need to appear before the question
// is answered — not as teaching, but as the working vocabulary for the call.
//
// The key distinction this card makes explicit: "limited support" at Level 4
// refers to SAFETY OVERSIGHT, separate from the teaching and growth a supervisor
// continues to provide at every level. Competence isn't the end of teaching —
// only the end of assigned safety oversight.
function LevelDefinitionsCard() {
  return (
    <div className="level-defs-card">
      <div className="level-defs-eyebrow">What Level 4 and Level 5 mean</div>
      <div className="level-defs-grid">
        <div className="level-def level-def-5">
          <div className="level-def-pill" style={{ background: '#4caf50' }}>5</div>
          <div className="level-def-body">
            <div className="level-def-headline">Practice ready</div>
            <p>
              <strong>No supervisor needs to be assigned</strong> to oversee this learner's care
              to ensure it is safe and effective. They know their limits, seek help when
              warranted, and collaborate thoughtfully — like every practicing physician.
            </p>
            <p className="level-def-aside">
              Teaching and growth from supervisors continue at this level — because that role
              never ends, regardless of competence.
            </p>
          </div>
        </div>

        <div className="level-def level-def-4">
          <div className="level-def-pill" style={{ background: '#aed15a' }}>4</div>
          <div className="level-def-body">
            <div className="level-def-headline">Not quite practice ready, but close</div>
            <p>
              A supervisor is <strong>still required</strong> to ensure this learner's care is
              safe and effective — but they only need to provide <strong>limited support</strong>
              around that safety oversight, and they do not need to be readily available.
            </p>
            <p className="level-def-aside">
              "Limited support" refers only to the safety-oversight role. The teaching and growth
              a supervisor provides is a <em>separate</em> role that continues at every level —
              and is one of the gifts of residency, not a sign the learner isn't ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// InternL5Callout — surfaces whenever an intern lands at (or is about to land at)
// Level 5. Disarms a real misuse: "this learner is practice ready as an intern,
// so they should graduate now." Practice ready is the floor for graduation, not
// the destination. The committee's job becomes setting goals beyond the floor.
function InternL5Callout({ context = 'overall' }) {
  const headlines = {
    overall: 'Level 5 as an intern ≠ graduate now',
    epa: 'Level 5 on this EPA — and the intern is just beginning',
    summary: 'This intern has cleared the floor on at least one EPA',
  };
  return (
    <div className={`intern-l5-callout intern-l5-${context}`} role="note">
      <div className="intern-l5-eyebrow">
        <span className="intern-l5-icon" aria-hidden="true">★</span>
        <span>For interns at Level 5</span>
      </div>
      <h4 className="intern-l5-headline">{headlines[context]}</h4>
      <p>
        An intern <em>can</em> reach Level 5 for a specific EPA, and you should record it when
        they do. But Level 5 is the <strong>floor</strong> for graduation eligibility — not the
        destination.
      </p>
      <p>
        Residency is a gift of time. The competency we want our graduates to take into
        independent practice should <strong>far exceed</strong> the practice-ready threshold.
        An intern who hits Level 5 has cleared the floor early — which is a chance to{' '}
        <em>build height</em>, not an argument for shortening their training.
      </p>
      <p className="intern-l5-action">
        <strong>The committee's job from here</strong> is not "how do we end this faster?" It is
        — <em>what individualized goals are now possible because the baseline is secure?</em> A
        specific population, a complex skill, a research question, a teaching role. Level 5
        unlocks the goals that were waiting for the floor.
      </p>
    </div>
  );
}

function ComingPanel({ icon, title, body, variant = 'default' }) {
  return (
    <div className={`coming-panel coming-${variant}`}>
      <div className="coming-shimmer" aria-hidden="true" />
      <div className="coming-head">
        <span className="coming-dot" aria-hidden="true" />
        <span className="coming-eyebrow">Coming capability</span>
      </div>
      <div className="coming-body">
        {icon && <span className="coming-icon">{icon}</span>}
        <div>
          <h4>{title}</h4>
          <p>{body}</p>
        </div>
      </div>
    </div>
  );
}

function ThemesBanner({ themes }) {
  const split = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  const strengths = split(themes.strengths);
  const growth = split(themes.growth);
  return (
    <div className="themes-banner">
      <div className="themes-banner-col strengths">
        <div className="themes-banner-label">Strengths</div>
        {strengths.length > 0 ? (
          <ul>{strengths.map((l, i) => <li key={i}>{l}</li>)}</ul>
        ) : (
          <span className="themes-empty">(none noted)</span>
        )}
      </div>
      <div className="themes-banner-col growth">
        <div className="themes-banner-label">Growth areas preventing safe care</div>
        {growth.length > 0 ? (
          <ul>{growth.map((l, i) => <li key={i}>{l}</li>)}</ul>
        ) : (
          <span className="themes-empty">(none noted)</span>
        )}
      </div>
    </div>
  );
}

function EpaPicker({ epaData, onPick, onSummary }) {
  const reviewed = EPAS.filter((e) => epaData[e.id].level !== null && !epaData[e.id].preFilled).length;
  const preFilledCount = EPAS.filter((e) => epaData[e.id].preFilled).length;
  const remaining = EPAS.length - reviewed - preFilledCount;
  return (
    <div className="screen">
      <h1 className="picker-title">Choose an EPA to review</h1>
      {preFilledCount > 0 && (
        <div className="prefilled-banner">
          <div className="prefilled-banner-eyebrow">Streamline mode</div>
          <p>
            <strong>{preFilledCount} {preFilledCount === 1 ? 'EPA is' : 'EPAs are'} pre-filled</strong> based on your streamline selection. Pre-filled EPAs are
            marked with a dashed border and a "pre-filled" tag. <strong>Your job is to actively scan for
            exceptions</strong> — click into any EPA the committee suspects is an outlier and walk
            the full algorithm. When you've reviewed all exceptions, go to the summary.
          </p>
        </div>
      )}
      <p className="note">
        {reviewed === 0 && preFilledCount === 0
          ? 'Pick whichever EPA the committee wants to assign first — you can take them in any order.'
          : `${reviewed} reviewed${preFilledCount ? ` · ${preFilledCount} pre-filled` : ''} · ${remaining} remaining.`}
      </p>
      <div className="picker-grid">
        {EPAS.map((e, idx) => {
          const d = epaData[e.id];
          const lvl = d.level ? LEVELS.find((l) => l.key === d.level) : null;
          const isPreFilled = d.preFilled;
          const needsDeepDive = d.needsDeepDive;
          return (
            <button
              key={e.id}
              className={`picker-card ${isPreFilled ? 'prefilled' : ''} ${needsDeepDive ? 'deepdive' : ''}`}
              onClick={() => onPick(idx)}
            >
              <div className="picker-num">EPA {e.id}</div>
              <div className="picker-name">{e.short}</div>
              <div className="picker-full">{e.name}</div>
              <div className="picker-status">
                {lvl ? (
                  <>
                    <span className="level-pill" style={{ background: lvl.color }}>
                      Level {lvl.label}
                    </span>
                    {isPreFilled && <span className="prefilled-tag">pre-filled</span>}
                  </>
                ) : needsDeepDive ? (
                  <span className="deepdive-tag">⚑ Deep-dive flagged</span>
                ) : (
                  <span className="unreviewed">Not reviewed</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {reviewed > 0 && (
        <div className="button-row">
          <button className="btn-primary" onClick={onSummary}>
            {remaining === 0 ? 'Go to Summary' : `Go to Summary (${remaining} unreviewed)`}
          </button>
        </div>
      )}
    </div>
  );
}

function EpaFlow({ epaIndex, epaStep, epaData, skipLevel2, certified, gutCheckAnswer, pgy, assignLevel, updateNote, advanceStep, finish }) {
  const epa = EPAS[epaIndex];
  const data = epaData[epa.id];

  if (epaStep === 0)
    return <EpaHeader epa={epa} data={data} certified={certified} skipLevel2={skipLevel2} gutCheckAnswer={gutCheckAnswer} onBegin={() => advanceStep(1)} onKeep={finish} />;

  if (epaStep === 1)
    return (
      <DecisionScreen
        certified={certified}
        epa={epa} step="is5" data={data}
        ruledOut={[]} highlight={['5']}
        heading="Understanding Level 5 — Practice Ready"
        levelKey="5"
        keyInsight="Practice ready does NOT mean independent. It means no one needs to be assigned to supervise the learner's care to ensure it is safe and effective. That standard assumes the learner knows their limits, seeks help when warranted, and collaborates thoughtfully with colleagues — the way every practicing physician does."
        question={`Is this trainee practice ready for ${epa.name}?`}
        updateNote={(v) => updateNote(epa.id, 'is5', v)}
        options={[
          { label: 'Yes — Level 5', action: () => { assignLevel(epa.id, '5'); advanceStep(6); } },
          { label: 'Not yet', action: () => advanceStep(skipLevel2 ? 3 : 2) },
        ]}
      />
    );

  if (epaStep === 2)
    return (
      <DecisionScreen
        certified={certified}
        epa={epa} step="is2" data={data}
        ruledOut={['5']} highlight={['2A', '2B']}
        heading="Understanding Level 2 — Supervisor Must Be Present"
        levelKey="2A" secondaryLevelKey="2B"
        keyInsight="Key distinction: Level 2 means a supervisor is assigned proactively to be in the room every time this trainee performs the activity. This is different from Levels 3 and 4, where a supervisor could happen to be in the room sometimes — but not for every instance."
        contextNote="For most EPAs, this will be 'no' for most residents — even interns at least by spring. Procedures (EPA 9) may be the exception."
        question={`Does this trainee need a supervisor proactively assigned to be in the room every time to perform ${epa.name}?`}
        updateNote={(v) => updateNote(epa.id, 'is2', v)}
        options={[
          { label: 'Yes — Level 2A', action: () => { assignLevel(epa.id, '2A'); advanceStep(6); } },
          { label: 'Yes — Level 2B', action: () => { assignLevel(epa.id, '2B'); advanceStep(6); } },
          { label: 'No', action: () => advanceStep(3) },
        ]}
      />
    );

  if (epaStep === 3) return <EstablishedScreen certified={certified} onContinue={() => advanceStep(4)} />;

  if (epaStep === 4)
    return (
      <DecisionScreen
        certified={certified}
        epa={epa} step="is4" data={data}
        ruledOut={['5', '2A', '2B', '1']} highlight={['4']}
        heading="Understanding Level 4 — Limited Support, Not Readily Available"
        levelKey="4"
        question={`For ${epa.name}, does this trainee need just limited support — where the supervisor does NOT need to be readily available?`}
        updateNote={(v) => updateNote(epa.id, 'is4', v)}
        showFootnote
        options={[
          { label: 'Yes — Level 4', action: () => { assignLevel(epa.id, '4'); advanceStep(6); } },
          { label: 'No — supervisor needs to be readily available', action: () => advanceStep(5) },
        ]}
      />
    );

  if (epaStep === 5)
    return (
      <DecisionScreen
        certified={certified}
        epa={epa} step="is3" data={data}
        ruledOut={['5', '2A', '2B', '1', '4']} highlight={['3A', '3B']}
        heading="Understanding Level 3 — Readily Available Supervision"
        levelKey="3A" secondaryLevelKey="3B"
        contextNote="The 3A vs. 3B distinction involves some judgment. Don't sweat it too much — just be consistent within your program and don't overthink it."
        question={`How much supervision does this trainee need for ${epa.name}?`}
        updateNote={(v) => updateNote(epa.id, 'is3', v)}
        showFootnote
        options={[
          { label: 'Level 3A — Close support and oversight', action: () => { assignLevel(epa.id, '3A'); advanceStep(6); } },
          { label: 'Level 3B — Moderate support and oversight', action: () => { assignLevel(epa.id, '3B'); advanceStep(6); } },
        ]}
      />
    );

  if (epaStep === 6) return <EpaResult epa={epa} level={data.level} pgy={pgy} onContinue={finish} />;

  return null;
}

function EpaResult({ epa, level, pgy, onContinue }) {
  const lvl = LEVELS.find((l) => l.key === level);
  const isFive = level === '5';
  const showIntern = isFive && isIntern(pgy);
  return (
    <div className="screen result-screen">
      <div className="progress">Decision</div>
      <h2 className="epa-name">EPA {epa.id}: {epa.name}</h2>
      <div className="result-headline">
        <span>The committee assigned</span>
        <span className="level-pill big" style={{ background: lvl.color }}>Level {lvl.label}</span>
      </div>
      <p className="result-subhead">{lvl.title}</p>

      {isFive && (
        <div className="level5-celebration">
          <div className="level5-eyebrow">Great — and now the fun begins</div>
          <p className="level5-lede">
            Being practice ready is not the finish line. It's the point at which learning gets
            really interesting.
          </p>
          <div className="level5-reasons">
            <div className="level5-reason">
              <span className="level5-icon">◆</span>
              <div>
                <strong>A gift to get tons of feedback.</strong> When the committee trusts the
                learner at Level 5, they can hear harder, sharper feedback without it feeling
                threatening — because the bar is already met.
              </div>
            </div>
            <div className="level5-reason">
              <span className="level5-icon">◆</span>
              <div>
                <strong>More autonomy in training.</strong> Supervisors can step back and let
                the learner drive, making the clinical reasoning and choices theirs — which is
                where the biggest growth happens.
              </div>
            </div>
            <div className="level5-reason">
              <span className="level5-icon">◆</span>
              <div>
                <strong>Freedom to pursue specific interests.</strong> With the baseline secured,
                the learner can chase individualized goals — a niche population, a skill they
                want to deepen, a question they want to answer.
              </div>
            </div>
          </div>
        </div>
      )}

      {showIntern && <InternL5Callout context="epa" />}

      <Scale ruledOut={[]} highlight={[level]} assigned={level} />
      <div className="button-row">
        <button className="btn-primary" onClick={onContinue}>Continue</button>
      </div>
    </div>
  );
}

function EpaHeader({ epa, data, certified, skipLevel2, gutCheckAnswer, onBegin, onKeep }) {
  const previously = data.level;
  return (
    <div className="screen">
      <div className="progress">EPA {epa.id}</div>
      <h2 className="epa-name">EPA {epa.id}: {epa.name}</h2>

      {data.needsDeepDive && (
        <div className="deepdive-callout">
          <div className="deepdive-callout-eyebrow">⚑ Committee flagged for deep dive</div>
          <p>
            The committee chose <strong>"Needs review"</strong> for this EPA during the
            affirmation step — meaning you have an explicit signal to slow down, surface
            concerns, and make this discussion more thorough than usual. Take your time with
            the notes and name what's driving the committee's uncertainty.
          </p>
        </div>
      )}

      {gutCheckAnswer === 'Not yet' && (
        <div className="per-epa-callout">
          <div className="per-epa-callout-eyebrow">Per-EPA decision, not overall</div>
          <p>
            You answered <strong>"Not yet"</strong> to the overall call — but that was a
            composite judgment across the whole scope of practice. A learner can be{' '}
            <strong>practice ready for one EPA and not another</strong>. That's precisely why we
            walk through each EPA individually — so the committee can name where the learner has
            arrived and where they still need time.
          </p>
        </div>
      )}

      <div className="framing">
        <p>{framingQuestion(epa.name)}</p>
        <p className="note">
          This determination should take into consideration a review of aggregate assessment data
          and synthesis by the CCC.
        </p>
      </div>

      {!certified && <div className="walkthrough-intro">
        <h3>How this works</h3>
        <p>
          We'll walk you through a short series of yes/no questions to help the committee decide
          what level of supervision to assign for this EPA. Answer each one based on the aggregate
          data you've reviewed, and the algorithm will land you on the right level.
        </p>
        <ol className="walkthrough-steps">
          <li>
            <strong>Is this learner practice ready?</strong> — If yes, they're a Level 5.
          </li>
          {!skipLevel2 && (
            <li>
              <strong>Do they need a supervisor proactively in the room every time?</strong> — If
              yes, they're a Level 2A or 2B.
            </li>
          )}
          <li>
            <strong>Do they need just limited support, with the supervisor not needing to be
            readily available?</strong> — If yes, they're a Level 4.
          </li>
          <li>
            <strong>Otherwise: is it close oversight (3A) or moderate oversight (3B)?</strong>
          </li>
        </ol>
        {skipLevel2 && (
          <p className="walkthrough-note">
            The Level 2 question has been <strong>skipped</strong> based on the committee's
            earlier decision that no EPA requires a supervisor proactively in the room every
            time. Every EPA will land at Level 3A, 3B, 4, or 5.
          </p>
        )}
      </div>}

      {previously && (
        <p className="note">
          Previously assigned: <strong>Level {previously}</strong>. You can re-review or keep the
          current level.
        </p>
      )}
      <div className="button-row">
        <button className="btn-primary" onClick={onBegin}>Begin Review</button>
        {previously && (
          <button className="btn-secondary" onClick={onKeep}>Keep Current Level &amp; Continue</button>
        )}
      </div>
    </div>
  );
}

function EstablishedScreen({ certified, onContinue }) {
  return (
    <div className="screen">
      <h2>We've established</h2>
      <ul className="checklist">
        <li>✓ The trainee is not yet practice ready for this EPA</li>
        <li>✓ A supervisor is still required to ensure the activity is done correctly and safely</li>
        <li>✓ No supervisor needs to be proactively assigned to the room every time</li>
      </ul>
      {!certified && (
        <>
          <p className="note">
            Note: at Levels 3 and 4, a supervisor could still happen to be in the room sometimes —
            but they aren't assigned to be there every time the trainee performs the activity.
          </p>
          <div className="teaching">
            <p>
              For all three remaining levels (3A, 3B, and 4), the trainee performs the activity and the
              supervisor does not need to be in the room. The difference between them is how much
              oversight the supervisor needs to provide and how readily available the supervisor needs
              to be.
            </p>
            <p>
              Your next question will help you determine whether this trainee needs just a light touch
              (Level 4), or whether the supervisor needs to remain readily available (Level 3A or 3B).
            </p>
          </div>
          <Footnote />
        </>
      )}
      <button className="btn-primary" onClick={onContinue}>Continue</button>
    </div>
  );
}

function DecisionScreen({
  certified, step, data, ruledOut, highlight, heading, levelKey, secondaryLevelKey,
  contextNote, keyInsight, question, options, updateNote, showFootnote,
}) {
  const level = LEVELS.find((l) => l.key === levelKey);
  const secondary = secondaryLevelKey ? LEVELS.find((l) => l.key === secondaryLevelKey) : null;
  return (
    <div className="screen">
      {!certified && (
        <div className="teaching">
          <h3>{heading}</h3>
          <p className="level-desc">{level.desc}</p>
          <p className="level-line"><strong>{level.label}:</strong> {level.title}</p>
          {secondary && (
            <p className="level-line"><strong>{secondary.label}:</strong> {secondary.title}</p>
          )}
          {contextNote && <p className="context-note">{contextNote}</p>}
        </div>
      )}
      {keyInsight && <div className="key-insight">{keyInsight}</div>}
      <h2 className="question">{question}</h2>
      <div className="button-row">
        {options.map((o) => (
          <button key={o.label} className="btn-choice" onClick={o.action}>{o.label}</button>
        ))}
      </div>
      <NotesArea
        label="Document your committee's reasoning."
        value={data.notes[step]}
        onChange={updateNote}
      />

      <ComingPanel
        variant="data"
        icon="⚡"
        title="Aggregate data for this EPA"
        body="A connected institution will see direct observations, MSF excerpts, continuity-preceptor narratives, and cross-EPA signals surfaced here — alongside the decision, not hidden behind it. The committee decides; the data just shows up."
      />

      {showFootnote && !certified && <Footnote />}
    </div>
  );
}

function Scale({ ruledOut = [], highlight = [], assigned = null }) {
  return (
    <div className="scale">
      {LEVELS.map((l) => {
        const out = ruledOut.includes(l.key);
        const hi = highlight.includes(l.key);
        const isAssigned = assigned === l.key;
        const dim = assigned && !isAssigned;
        return (
          <div
            key={l.key}
            className={`scale-row ${out ? 'ruled-out' : ''} ${hi ? 'highlight' : ''} ${isAssigned ? 'assigned' : ''} ${dim ? 'dim' : ''}`}
            style={{ borderLeftColor: l.color }}
          >
            <span className="scale-label" style={{ background: l.color }}>{l.label}</span>
            <span className="scale-title">{l.title}</span>
            {isAssigned && <span className="scale-marker">← assigned</span>}
          </div>
        );
      })}
    </div>
  );
}

function Footnote() {
  return (
    <div className="footnote">
      <p><em>{FOOTNOTE[0]}</em></p>
      <ul>
        <li>{FOOTNOTE[1]}</li>
        <li>{FOOTNOTE[2]}</li>
      </ul>
    </div>
  );
}

function NotesArea({ label, value, onChange, rows = 5 }) {
  return (
    <div className="notes">
      <label>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </div>
  );
}

function Summary({ trainee, gutCheck, themes, epaData, finalizedAt, onFinalize, onJumpToEpa, onRestart }) {
  const [showFinalize, setShowFinalize] = useState(false);
  const internWithLevel5 =
    isIntern(trainee.pgy) &&
    Object.values(epaData).some((d) => d.level === '5');
  const counts = useMemo(() => {
    const c = {};
    LEVELS.forEach((l) => (c[l.key] = 0));
    Object.values(epaData).forEach((e) => {
      if (e.level) c[e.level] = (c[e.level] || 0) + 1;
    });
    return c;
  }, [epaData]);

  const formatText = () => {
    const lines = [];
    lines.push('CCC Entrustment Assessment');
    lines.push(`Trainee: ${trainee.name}`);
    lines.push(`PGY: ${trainee.pgy}`);
    lines.push(`Review period: ${trainee.period}`);
    lines.push(`CCC reviewer: ${trainee.chair}`);
    lines.push('');
    lines.push(`Overall call: ${gutCheck.answer || '(not answered)'}`);
    if (gutCheck.notes) lines.push(`Notes: ${gutCheck.notes}`);
    const pushList = (title, raw) => {
      const items = raw.split('\n').map((s) => s.trim()).filter(Boolean);
      if (items.length === 0) return;
      lines.push('');
      lines.push(title);
      items.forEach((i) => lines.push(`  - ${i}`));
    };
    pushList('Remarkable areas of strength:', themes.strengths);
    pushList('Growth areas preventing safe & effective care:', themes.growth);
    lines.push('');
    EPAS.forEach((e) => {
      const d = epaData[e.id];
      lines.push(`EPA ${e.id}: ${e.name}`);
      lines.push(`  Level: ${d.level || 'Not reviewed'}`);
      Object.entries(d.notes).forEach(([k, v]) => {
        if (v) lines.push(`  [${k}] ${v}`);
      });
      lines.push('');
    });
    return lines.join('\n');
  };

  const copy = () => {
    navigator.clipboard.writeText(formatText());
    alert('Copied to clipboard');
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const stripNewlines = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const splitLines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

    const meta = [
      ['Report type', 'CCC Entrustment Assessment'],
      ['Generated', new Date().toISOString()],
      ['Trainee', trainee.name],
      ['PGY level', trainee.pgy],
      ['Review period', trainee.period],
      ['CCC reviewer', trainee.chair],
    ];
    meta.push(
      [],
      ['Overall call answer', gutCheck.answer || ''],
      ['Overall call notes', stripNewlines(gutCheck.notes)],
      [],
      ['Strengths', ''],
      ...splitLines(themes.strengths).map((s) => ['', s]),
      [],
      ['Growth areas preventing safe & effective care', ''],
      ...splitLines(themes.growth).map((s) => ['', s])
    );
    const wsMeta = XLSX.utils.aoa_to_sheet(meta);
    wsMeta['!cols'] = [{ wch: 28 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Assessment');

    const rows = [
      [
        'EPA #',
        'EPA Short Name',
        'EPA Full Name',
        'Assigned Level',
        'Level Description',
        'Rationale: Level 5 (practice ready) question',
        'Rationale: Level 2 (supervisor in room) question',
        'Rationale: Level 4 (limited support) question',
        'Rationale: 3A vs 3B question',
        'Combined Rationale',
      ],
    ];
    EPAS.forEach((e) => {
      const d = epaData[e.id];
      const lvl = d.level ? LEVELS.find((l) => l.key === d.level) : null;
      const combined = [d.notes.is5, d.notes.is2, d.notes.is4, d.notes.is3]
        .filter(Boolean)
        .map(stripNewlines)
        .join(' | ');
      rows.push([
        e.id,
        e.short,
        e.name,
        d.level || 'Not reviewed',
        lvl ? lvl.title : '',
        stripNewlines(d.notes.is5),
        stripNewlines(d.notes.is2),
        stripNewlines(d.notes.is4),
        stripNewlines(d.notes.is3),
        combined,
      ]);
    });
    const wsEpa = XLSX.utils.aoa_to_sheet(rows);
    wsEpa['!cols'] = [
      { wch: 7 }, { wch: 28 }, { wch: 60 }, { wch: 14 }, { wch: 50 },
      { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, wsEpa, 'EPA Assignments');

    const dist = [['Level', 'Title', 'Count']];
    LEVELS.forEach((l) => dist.push([l.key, l.title, counts[l.key]]));
    const wsDist = XLSX.utils.aoa_to_sheet(dist);
    wsDist['!cols'] = [{ wch: 8 }, { wch: 60 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsDist, 'Distribution');

    const filename = `ccc-${(trainee.name || 'assessment').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const text = formatText();
    const lines = doc.splitTextToSize(text, 520);
    doc.setFontSize(10);
    let y = 40;
    lines.forEach((line) => {
      if (y > 740) { doc.addPage(); y = 40; }
      doc.text(line, 40, y);
      y += 14;
    });
    doc.save('ccc-assessment.pdf');
  };

  return (
    <div className="screen summary">
      <h1>CCC Assessment Summary</h1>

      {finalizedAt ? (
          <div className="finalized-banner finalized">
            <span className="finalized-icon">✓</span>
            <div>
              <div className="finalized-eyebrow">Finalized</div>
              <p>
                This assessment was committed on{' '}
                <strong>{new Date(finalizedAt).toLocaleString()}</strong>. It is now saved to this
                browser under <strong>{trainee.name || 'Unknown trainee'}</strong> and will be
                available as a prior cycle the next time this trainee is reviewed.
              </p>
            </div>
          </div>
        ) : (
          <div className="finalized-banner pending">
            <span className="finalized-icon">◌</span>
            <div>
              <div className="finalized-eyebrow">Not yet finalized</div>
              <p>
                This assessment is a <strong>draft</strong>. Finalize it below to commit the
                decisions and make them available as prior-cycle data for this trainee's next
                review.
              </p>
            </div>
          </div>
        )
      }
      <div className="summary-header">
        <div><strong>Trainee:</strong> {trainee.name}</div>
        <div><strong>PGY:</strong> {trainee.pgy}</div>
        <div><strong>Review period:</strong> {trainee.period}</div>
        <div><strong>CCC reviewer:</strong> {trainee.chair}</div>
      </div>
      <div className="card">
        <h3>Overall call</h3>
        <p><strong>{gutCheck.answer || 'Not answered'}</strong></p>
        {gutCheck.notes && <p>{gutCheck.notes}</p>}
      </div>
      {(themes.strengths || themes.growth) && (
        <div className="card">
          <h3>Cross-cutting themes</h3>
          {themes.strengths && (
            <>
              <h4 className="theme-subhead">Remarkable areas of strength</h4>
              <ul>
                {themes.strengths.split('\n').map((t) => t.trim()).filter(Boolean).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {themes.growth && (
            <>
              <h4 className="theme-subhead">Growth areas preventing safe &amp; effective care</h4>
              <ul>
                {themes.growth.split('\n').map((t) => t.trim()).filter(Boolean).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {internWithLevel5 && <InternL5Callout context="summary" />}

      <div className="distribution">
        {LEVELS.map((l) => (
          <div key={l.key} className="dist-row">
            <span className="dist-label" style={{ background: l.color }}>{l.label}</span>
            <div className="dist-bar">
              <div className="dist-fill" style={{ width: `${counts[l.key] * 30}px`, background: l.color }} />
            </div>
            <span>{counts[l.key]}</span>
          </div>
        ))}
      </div>

      <table className="epa-table">
        <thead>
          <tr><th>#</th><th>EPA</th><th>Level</th><th>Notes</th><th></th></tr>
        </thead>
        <tbody>
          {EPAS.map((e, idx) => {
            const d = epaData[e.id];
            const lvl = LEVELS.find((l) => l.key === d.level);
            const allNotes = Object.values(d.notes).filter(Boolean).join(' · ');
            return (
              <tr key={e.id}>
                <td>{e.id}</td>
                <td>{e.short}</td>
                <td>
                  {d.level ? (
                    <span className="level-pill" style={{ background: lvl.color }}>{d.level}</span>
                  ) : (
                    <span className="unreviewed">Not reviewed</span>
                  )}
                </td>
                <td className="notes-cell">{allNotes}</td>
                <td>
                  <button className="btn-link" onClick={() => onJumpToEpa(idx)}>
                    {d.level ? 'Re-review' : 'Review Now'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="coach-review-callout">
        <div className="coach-review-eyebrow">Next step — close the loop</div>
        <p>
          In an ideal world, these assignments and the reasoning behind them are
          <strong> reviewed and finalized collaboratively with the resident and their coach</strong>.
          The committee's best thinking becomes shared material the learner can act on, and the
          coach can translate into a concrete growth plan. That's what closes the loop between
          assessment and learning — and it's the main point of documenting the reasoning in the
          first place.
        </p>
      </div>

      <ComingPanel
        variant="share"
        icon="↗"
        title="Share with the resident and their coach"
        body="A future release lets the committee send this summary — with every rationale intact — directly into the resident's and coach's portal, with space for them to respond, ask questions, and co-author a growth plan. Assessment becomes learning, in the same tool."
      />

      <div className="button-row">
        {!finalizedAt && (
          <button
            className="btn-finalize"
            onClick={() => setShowFinalize(true)}
          >
            ✓ Finalize assessment
          </button>
        )}
        <button className="btn-primary" onClick={exportExcel}>↓ Export to Excel</button>
        <button className="btn-secondary" onClick={exportPdf}>Export as PDF</button>
        <button className="btn-secondary" onClick={copy}>Copy to Clipboard</button>
        <button className="btn-danger" onClick={onRestart}>Start Over</button>
      </div>

      {showFinalize && (
        <div className="modal-backdrop" onClick={() => setShowFinalize(false)}>
          <div className="modal confirm-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="card-eyebrow">Finalize assessment</div>
            <h3>Commit this assessment?</h3>
            <p className="confirm-sub">
              Finalizing saves a permanent snapshot of this cycle under{' '}
              <strong>{trainee.name}</strong>. It will appear automatically as a prior cycle the
              next time this trainee is reviewed. You can still edit afterward — a later
              finalization simply adds another cycle.
            </p>
            <div className="confirm-summary">
              <div className="confirm-row">
                <span className="confirm-check on">✓</span>
                <div>
                  Saved to this browser's local storage. <strong>Nothing is uploaded to any
                  server.</strong>
                </div>
              </div>
              <div className="confirm-row">
                <span className="confirm-check on">✓</span>
                <div>
                  Export to Excel or PDF will continue to work after finalization.
                </div>
              </div>
              <div className="confirm-row">
                <span className="confirm-check deepdive">⚑</span>
                <div>
                  Best practice: <strong>review these decisions and rationales with the resident
                  and their coach</strong> before finalizing. The committee's reasoning is most
                  useful when it reaches the learner.
                </div>
              </div>
            </div>
            <div className="button-row">
              <button className="btn-secondary" onClick={() => setShowFinalize(false)}>
                Go back
              </button>
              <button
                className="btn-finalize"
                onClick={() => {
                  setShowFinalize(false);
                  onFinalize();
                }}
              >
                ✓ Yes, finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
