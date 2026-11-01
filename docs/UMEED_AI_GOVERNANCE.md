# UMEED — AI Governance, Advisory Boundaries, and Safety Guardrails
**Version**: 2.0.0  
**Classification**: AI Ethics and Safety Standard  

---

## 1. Absolute AI Boundary Principles

UMEED integrates Google Gemini multimodal models to accelerate emergency signal triage. However, humanitarian assistance involves consequential decisions affecting vulnerable lives. Therefore, AI operates under strict architectural boundaries:

### Invariants:
1. **Advisory Only**: All AI outputs are labeled `AI_ADVISORY`.
2. **No Autonomous Approval**: AI models cannot approve citizen reports, convert incidents into operational cases, or authorize NGO dispatch.
3. **No Autonomous Accreditation**: AI cannot verify an NGO partner or alter an organization's accreditation status.
4. **No Fabricated Confidence**: If model inference fails or credentials are unconfigured, execution state falls back to `PROVIDER_UNAVAILABLE` or `MANUAL_REVIEW_REQUIRED`. Simulated scores are strictly prohibited.
5. **Human-in-the-Loop Gate**: Conversion of an incident to a case requires explicit human coordinator authorization (`POST /api/incidents/[publicReference]/review`).

---

## 2. Gemini Multimodal Triage Architecture

- **Model**: Gemini 2.5 Flash (`gemini-2.5-flash`), balancing sub-second triage latency with high clinical/trauma reasoning fidelity.
- **Structured Schema**: Enforced through strict JSON schemas with system instruction prompts.
- **Execution States**:
  - `LIVE_AI_SUCCESS`: Inference completed and parsed against canonical schema.
  - `MANUAL_REVIEW_REQUIRED`: Low confidence or ambiguity detected; flagged for human triage.
  - `PROVIDER_UNAVAILABLE`: API key missing or provider network unreachable; fail-safe fallback to manual queue.
  - `VALIDATION_FAILED`: Model response failed schema parsing.

---

## 3. Prompt Injection Defense

All citizen-submitted descriptions, social media crawl snippets, and external data are treated as untrusted input.
- System prompts are enclosed in immutable boundaries.
- User inputs are sanitized to strip instruction-override patterns (`Ignore previous instructions`, `System prompt:`, etc.).
- Categorical outputs are strictly mapped to `@umeed/contracts` enums before downstream processing.
