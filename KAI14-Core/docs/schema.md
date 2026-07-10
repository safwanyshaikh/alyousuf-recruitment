# KAI14-Core — Canonical Schemas (as implemented)

## Candidates (PK: KAINo at column 1, written at birth)
`KAINo · CreatedAt · Source · CampaignID · FullName · Email · Mobile · PassportNo ·
Nationality · DOB · Age · Trade · Industry · Experience · GulfExperience · Education ·
PositionApplied · CVLink · Score · Verdict · Flags · KAIAssessment · MissingFields ·
State · RequirementID · UpdatedAt`

- Dup keys: PassportNo → Mobile → Email
- Foundation cols: 1–4 · K14 cols: 9–23 · Execution cols: 24–26

## _Meta (dedup index — written inside the candidate lock)
`Key · Email · Mobile · PassportNo · KAINo · Name · CreatedAt`
Key = `email|mobile|passport`

## _Queue (Foundation Queue)
`QueueID · KAINo · Step · Status · FailureReason · RetryCount · CreatedAt · UpdatedAt`
Step ∈ {INTAKE, MATCH} · Status ∈ {PENDING, DONE, FAILED}

## _Requirements (PK: RequirementID, FK-clean)
`RequirementID · CreatedAt · ClientID · ProjectID · CampaignID · Trade · Quantity ·
Location · MinExperience · Nationality · Priority · Status · JDLink`

## _Clients
`ClientID · Name · Country · Industry · CreatedAt`

## _Campaigns (Rule 13 — mandatory FK on every candidate/requirement)
`CampaignID · ClientID · Name · HiringMode · CreatedAt` · default `CMP-INBOUND-DEFAULT`

## KAI format
`AYE-KAI-YYYY-NNNNNN` (prod) · `TEST-KAI-YYYY-NNNNNN` (isolated tests)
Counter: script property `kai14_counter` / `kai14_counter_test`. LockService-serialized.
