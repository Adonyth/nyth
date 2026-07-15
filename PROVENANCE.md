# Provenance

This repository is published openly to establish **public, dated provenance** of the nyth concept and its
implemented mechanisms, and to serve as **prior art**.

## What this establishes (and what it does not)

- **Establishes:** a public, timestamped record that this design and this working implementation existed on
  the dates in the commit history — a defensive publication that can act as prior art against later claims,
  and a verifiable record of authorship and sequence.
- **Does not:** grant a monopoly, create exclusivity over the ideas, or prevent others from building similar
  things. Ideas are not property; a working implementation, published first and openly, is the record.

## The timestamp

The authoritative timestamp is the **Git commit history** of this repository once it is published to a public
host (e.g. a public Git remote), which records commit dates and content hashes immutably.

For an independent, host-agnostic anchor, the initial release is also identified by a content hash recorded
below. Anyone can recompute it from the released files to verify integrity.

```
Release:        nyth-l1 — first public increment
Local commit:   <filled at commit time>
Content SHA-256: <filled at release time — see RELEASE-HASH.txt>
```

Optional stronger anchoring (recommended, done by the author): submit the initial commit hash to an
independent timestamping authority (e.g. an OpenTimestamps `.ots` proof anchored to a public blockchain, or a
Zenodo release with a DOI). Either produces a third-party-verifiable timestamp that does not depend on any
single host.

## Scope of this publication

Published: the software layer and the concept/design (this repo — `README.md`, `VISION.md`, and source).

Deliberately **not** published here: internal strategy, market/competitive analysis, risk assessments, and
experiment designs. Their absence is intentional; this repository is the product and the concept, nothing more.
