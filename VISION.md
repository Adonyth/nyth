# nyth — vision

*A public statement of the concept and its design principles. Timestamped by this repository's commit history.*

## The premise

AI today is a guest on devices built for a pre-AI world — parasitic on phones and computers designed
around touchscreens and taps. That is a transitional arrangement, not the destination. The destination is
an AI-native way of using your devices: one where an assistant is not an app you open, but a presence you
live with — and one that belongs to **you**, not to a cloud landlord.

nyth is a design for that: a single AI presence that spans your personal devices, runs on hardware you own
where it can, and treats your data, your memory, and your right to leave as things you hold — not things
rented back to you.

## Principles

1. **Sovereignty over convenience-with-lock-in.** You should be able to run the model locally, swap providers
   freely, and export everything the assistant knows about you. No vendor should hold a veto over your access
   to your own assistant. Open weights, local compute, and a portable memory are the mechanisms; the right to
   *leave with your data* is the test.

2. **Local-first.** Your context and memory live on your device by default. What leaves your device is your
   choice, made explicitly — not a default you have to discover and disable.

3. **A mode system as the operating logic.** How the device behaves is governed by modes, not by a grid of
   apps:
   - **accompany** — a present, conversational partner; interaction can leave the screen entirely.
   - **alone** — quiet by contract: no unprompted voice, no interruption. Because a mode whose whole promise
     is *not being spoken at* cannot depend on speech to enter or leave it, mode-switching must always have a
     silent, physical path.
   - and others for the shape of a moment (work, sleep, do-not-disturb).

4. **The screen becomes optional.** Voice and ambient interaction, earpieces for input and output, glasses for
   sight — a well-designed accompany mode can complete real tasks without a display. The screen stays available;
   it stops being mandatory.

5. **Continuity is the point.** One memory that follows you across devices and surfaces, so you never
   re-explain yourself. An assistant that grows more yours the more you use it — and that you can pick up and
   move to another device, or another vendor, without losing that.

## What this repository is

The first working increment of the software layer: an on-device companion with a mode system, portable
memory, and a provider-neutral model backend that runs fully offline on a local model. It is deliberately
narrow and honest about its scope. The larger vision — a family of devices sharing one sovereign AI layer —
is a long arc; this is where it starts, in the open.

## Provenance

This document and the accompanying implementation are published openly to establish public, dated provenance
of the concept and its mechanisms, and to serve as prior art. See the repository commit history and
[PROVENANCE.md](./PROVENANCE.md).
