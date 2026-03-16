import { useState } from "react";

const CLUSTERS = [
  { id: "A", name: "High-Support" },
  { id: "B", name: "Independent" },
  { id: "C", name: "Directive" },
  { id: "D", name: "Example-Driven" },
  { id: "E", name: "Rule-Based" },
  { id: "F", name: "Socratic" },
];

const FLAGS = [
  { id: "VS", label: "VS — Volume-Sensitive" },
  { id: "TS", label: "TS — Tone-Sensitive" },
  { id: "AVP", label: "AVP — Anti-Vague-Praise" },
  { id: "FA", label: "FA — Feedback-Averse" },
];

const CLUSTER_INSTRUCTIONS = {
  A: "Lead with one specific, genuine praise. Then give ONE teaching point only — show what the fix looks like by modeling it. End with encouragement. Warm, supportive tone throughout.",
  B: "Skip empty praise. Be direct and specific. Name exactly what needs to change and trust the student to do it. Crisp, efficient, respectful.",
  C: "Give feedback as numbered steps the student can follow. Concrete, sequential, procedural. Tell them exactly what to do in order.",
  D: "Show rather than tell. Give a brief model sentence or example of what the writing could look like, then connect it to their own words. Let the example do the teaching.",
  E: "Name the writing rule or principle first. Then explain why it matters. Then show how it applies to their specific writing. Principle → reason → application.",
  F: "Ask 2-3 focused questions that guide the student toward discovering what needs to change. After each question, give a brief hint (1 sentence) so the student isn't left stuck. Don't answer the questions for them.",
};

const FLAG_INSTRUCTIONS = {
  VS: "Give feedback on no more than 2 things total, even if more issues exist.",
  TS: "Use soft, growth-focused language. Frame everything as 'here's how to grow' not 'here's what's wrong.'",
  AVP: "Be specific with any praise or skip it entirely. No phrases like 'great job' or 'good work' without explaining exactly what is good.",
  FA: "Keep feedback brief. One point only. Acknowledge before correcting.",
};

function buildSystemPrompt(cluster, activeFlags) {
  const flagNotes = activeFlags
    .map((f) => FLAG_INSTRUCTIONS[f])
    .filter(Boolean)
    .join(" ");

  return `You are a writing feedback tool for middle school students. You read student writing and give feedback that students can read and act on right now.

READING LEVEL: Write all feedback at a 4th grade reading level. Short sentences. Simple words. No jargon. Nothing a 10-year-old couldn't understand.

YOUR JOB IN TWO PARTS:
First, infer three things from the writing:
1. WRITE TYPE: Is this a Narrative (story/moment), Expository (explaining), or Argumentative (claiming and defending) quick write?
2. ORGANIZATIONAL PROFILE: How is the student thinking?
   - List: Facts exist alone, no connections between them
   - Sequential: Organized by time (first, then, next) but no "because" or "so"
   - Categorical: Grouped into reasons/categories but the reasons don't connect
   - Connective: Shows cause-effect chains, uses "because" and "which means"
3. GEORGIA STANDARD: Pick the most relevant standard being tested:
   - 6.T.SS.1.c (connecting ideas, transitions)
   - 6.T.SS.1.d (organized structure with intro and conclusion)
   - 6.T.T.3.a (claim + evidence + counterclaim)
   - 6.L.GC.2.b (sentence variety)
   - K-12.P.EICC.4 (writing process, drafting, revising)

Then give the feedback.

FEEDBACK DELIVERY — Cluster ${cluster}: ${CLUSTER_INSTRUCTIONS[cluster]}

${flagNotes ? "IMPORTANT FLAG MODIFICATIONS: " + flagNotes : ""}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS (use these exact labels):
WRITE TYPE: [Narrative / Expository / Argumentative]
PROFILE: [List / Sequential / Categorical / Connective]
STANDARD: [e.g. 6.T.T.3.a]
---
[Your student-facing feedback here, written at 4th grade reading level, matching Cluster ${cluster} delivery style]`;
}

function parseFeedbackResponse(text) {
  const lines = text.split("\n");
  let writeType = "";
  let profile = "";
  let standard = "";
  let feedbackLines = [];
  let pastDivider = false;

  for (const line of lines) {
    if (line.startsWith("WRITE TYPE:"))
      writeType = line.replace("WRITE TYPE:", "").trim();
    else if (line.startsWith("PROFILE:"))
      profile = line.replace("PROFILE:", "").trim();
    else if (line.startsWith("STANDARD:"))
      standard = line.replace("STANDARD:", "").trim();
    else if (line.trim() === "---") pastDivider = true;
    else if (pastDivider) feedbackLines.push(line);
  }

  return { writeType, profile, standard, feedback: feedbackLines.join("\n").trim() };
}

export default function QuickWriteReader() {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [activeFlags, setActiveFlags] = useState([]);
  const [writing, setWriting] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const toggleFlag = (flagId) => {
    setActiveFlags((prev) =>
      prev.includes(flagId) ? prev.filter((f) => f !== flagId) : [...prev, flagId]
    );
  };

  const isReady = selectedCluster && writing.trim().length > 20;

  const handleSubmit = async () => {
    if (!isReady) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Option A: Direct browser call (dev/demo only — exposes key client-side)
      // Replace with Option B for production.
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildSystemPrompt(selectedCluster, activeFlags),
          messages: [
            {
              role: "user",
              content: `Here is the student's writing:\n\n${writing.trim()}`,
            },
          ],
        }),
      });

      // Option B: Server-side proxy (production pattern — use this for deployment)
      // Uncomment below and remove Option A above.
      // const response = await fetch("/api/generate", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     systemPrompt: buildSystemPrompt(selectedCluster, activeFlags),
      //     userMessage: `Here is the student's writing:\n\n${writing.trim()}`,
      //   }),
      // });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API error");

      const text = data.content[0].text;
      setResult({ ...parseFeedbackResponse(text), cluster: selectedCluster, flags: [...activeFlags] });
    } catch (err) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setWriting("");
    setSelectedCluster(null);
    setActiveFlags([]);
    setError("");
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: "1.5rem", color: "#111" }}>
        Quick Write Reader
      </h2>

      {/* Cluster selection */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={labelStyle}>Feedback cluster</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {CLUSTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCluster(c.id)}
              style={{
                border: selectedCluster === c.id ? "2px solid #185FA5" : "1px solid #ddd",
                borderRadius: 8,
                padding: "10px 8px",
                cursor: "pointer",
                textAlign: "center",
                background: selectedCluster === c.id ? "#E6F1FB" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 500, display: "block", color: selectedCluster === c.id ? "#185FA5" : "#111" }}>
                {c.id}
              </span>
              <span style={{ fontSize: 11, color: selectedCluster === c.id ? "#185FA5" : "#888", marginTop: 2, display: "block" }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modifier flags */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={labelStyle}>Modifier flags (optional)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FLAGS.map((f) => {
            const isActive = activeFlags.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFlag(f.id)}
                style={{
                  border: isActive ? "1.5px solid #BA7517" : "1px solid #ddd",
                  borderRadius: 8,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  background: isActive ? "#FAEEDA" : "#fff",
                  color: isActive ? "#854F0B" : "#555",
                  transition: "all 0.15s",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Writing input */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={labelStyle}>Student writing</div>
        <textarea
          value={writing}
          onChange={(e) => setWriting(e.target.value)}
          placeholder="Paste the student's quick write here..."
          style={{
            width: "100%",
            minHeight: 160,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            fontFamily: "sans-serif",
            lineHeight: 1.6,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isReady || loading}
        style={{
          width: "100%",
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: isReady && !loading ? "#fff" : "#f5f5f5",
          color: isReady && !loading ? "#111" : "#aaa",
          fontSize: 14,
          fontWeight: 500,
          cursor: isReady && !loading ? "pointer" : "not-allowed",
          transition: "all 0.15s",
        }}
      >
        {loading ? "Reading..." : "Generate feedback"}
      </button>

      {error && (
        <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>{error}</p>
      )}

      {/* Result */}
      {result && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: "1.25rem", marginTop: "1.5rem", background: "#fff" }}>
          <button
            onClick={handleReset}
            style={{ float: "right", fontSize: 12, color: "#888", border: "none", background: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Start over
          </button>
          <div style={labelStyle}>Inferred from writing</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem", marginTop: 8 }}>
            {result.writeType && <Badge label={result.writeType} color="gray" />}
            {result.profile && <Badge label={`${result.profile} thinker`} color="teal" />}
            {result.standard && <Badge label={result.standard} color="purple" />}
            <Badge label={`Cluster ${result.cluster}`} color="gray" />
            {result.flags.map((f) => <Badge key={f} label={f} color="amber" />)}
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "1rem 0" }} />
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "#111", whiteSpace: "pre-wrap" }}>
            {result.feedback}
          </p>
        </div>
      )}
    </div>
  );
}

function Badge({ label, color }) {
  const colors = {
    gray:   { bg: "#f1efe8", text: "#5f5e5a" },
    teal:   { bg: "#e1f5ee", text: "#0f6e56" },
    purple: { bg: "#eeedfe", text: "#3c3489" },
    amber:  { bg: "#faeeda", text: "#854f0b" },
  };
  const { bg, text } = colors[color] || colors.gray;
  return (
    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500, background: bg, color: text }}>
      {label}
    </span>
  );
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: "#888",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 6,
};
