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
Release:         nyth-l1 — first public increment
Initial commit:  bb3520bc9a5430ae328b0274f439939fad63870e  (2026-07-15T04:25:30-04:00)
Content SHA-256: fc76ae04108c7d64163f1dc8e84b6aa3a6b4bcaadd044da82a5619ba03c8faf6  (see RELEASE-HASH.txt)
```

### Independent blockchain anchor (OpenTimestamps)

A host-independent timestamp has been created with [OpenTimestamps](https://opentimestamps.org):

- **[`PROVENANCE-ANCHOR.txt`](./PROVENANCE-ANCHOR.txt)** records the commit hash and content SHA-256 above.
- **[`PROVENANCE-ANCHOR.txt.ots`](./PROVENANCE-ANCHOR.txt.ots)** is its OpenTimestamps proof, committing that
  file's hash to public timestamp calendars and, once a Bitcoin block confirms, to the **Bitcoin blockchain** —
  a third-party-verifiable timestamp that depends on no single host, account, or Git provider.

Verify it yourself:

```bash
pip install opentimestamps-client
ots upgrade PROVENANCE-ANCHOR.txt.ots   # pulls in the Bitcoin attestation once confirmed (~a few hours after stamping)
ots verify  PROVENANCE-ANCHOR.txt.ots   # checks the file against the on-chain timestamp
```

(At publication the proof is a pending calendar commitment; `ots upgrade` completes the Bitcoin attestation.)

## Scope of this publication

Published: the software layer and the concept/design (this repo — `README.md`, `VISION.md`, and source).

Deliberately **not** published here: internal strategy, market/competitive analysis, risk assessments, and
experiment designs. Their absence is intentional; this repository is the product and the concept, nothing more.
