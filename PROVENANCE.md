# Provenance

This repository is published openly to preserve **public, inspectable provenance** of the nyth concept and
its implemented mechanisms, and to support a defensive-publication record. Whether a disclosure qualifies
as prior art is jurisdiction- and fact-specific, including whether its public accessibility and date can be
shown with adequate evidence.

## What this establishes (and what it does not)

- **Establishes:** an inspectable association between this disclosure and exact Git objects, plus an
  independently checkable timestamp proof for the anchored initial-release artifact. These can be evidence
  in a later provenance or prior-art analysis when the exact artifact, accessibility, and date are shown.
- **Does not:** make Git's author or committer dates trusted publication timestamps, guarantee a legal
  prior-art result, grant a monopoly, create exclusivity over the ideas, or prevent similar implementations.

## The timestamp

The **Git commit history** binds each commit object's metadata and referenced tree to its object ID. Git
author and committer dates can be supplied by the person creating the commit, as documented by
[`git commit`](https://git-scm.com/docs/git-commit#_commit_information), so they do not independently prove
when a disclosure became publicly accessible. Public hosting is useful provenance evidence, but it should be
paired with preserved evidence of accessibility and an independently verified timestamp when a date is
important. For example, [USPTO MPEP § 2128](https://www.uspto.gov/web/offices/pac/mpep/s2128.html) treats
public accessibility and evidence of the public-posting date as separate requirements in its analysis of
electronic publications.

For an independent, host-agnostic anchor, the initial release is also identified by a content hash recorded
below. Anyone can recompute it from the released files to verify integrity.

```
Release:         nyth-l1 — first public increment
Initial commit:  bb3520bc9a5430ae328b0274f439939fad63870e  (2026-07-15T04:25:30-04:00)
Content SHA-256: fc76ae04108c7d64163f1dc8e84b6aa3a6b4bcaadd044da82a5619ba03c8faf6  (see RELEASE-HASH.txt)
```

### Independent blockchain anchor (OpenTimestamps)

A host-independent timestamp has been created with [OpenTimestamps](https://opentimestamps.org):

- **[`PROVENANCE-ANCHOR.txt`](./PROVENANCE-ANCHOR.txt)** contains two different historical identifiers: its
  `Git commit` field is `ca068e97…`, the commit that recorded the initial provenance metadata, while its
  `Content SHA-256` field is the tar archive hash of the initial software commit `bb3520bc…` shown above.
  The anchor file's parenthetical `git archive HEAD` should therefore be read as referring to that initial
  software snapshot, not to the `ca068e97…` archive. The anchor is left byte-for-byte unchanged because its
  OpenTimestamps proof commits to that exact file.
- **[`PROVENANCE-ANCHOR.txt.ots`](./PROVENANCE-ANCHOR.txt.ots)** is its OpenTimestamps proof. A complete,
  valid proof can attest that the anchor's digest existed before a particular Bitcoin block; that conclusion
  depends on verifying the proof against the exact anchor and trusted Bitcoin chain data.

Verify it yourself:

```bash
pip install opentimestamps-client
ots info   PROVENANCE-ANCHOR.txt.ots   # inspect the proof and its attestations
ots verify PROVENANCE-ANCHOR.txt.ots   # verify it against the exact anchor and Bitcoin chain data
```

Repository history records an upgrade of the proof in commit `ee4e4e5`. That record is not a substitute for
independent verification: run `ots verify` against the exact anchor and proof, following the
[client's Bitcoin node requirements](https://github.com/opentimestamps/opentimestamps-client#requirements).
A machine without a compatible verifier and trusted chain data can confirm file presence and hashes, but
cannot claim it independently verified the Bitcoin attestation.

## Scope of this publication

Published: the software layer and the concept/design (this repo — `README.md`, `VISION.md`, and source).

Deliberately **not** published here: internal strategy, market/competitive analysis, risk assessments, and
experiment designs. Their absence is intentional; this repository is the product and the concept, nothing more.
