# FoundIt demo guide

This runbook keeps a hackathon demonstration short, honest, and repeatable.

## Before the demo

- Put the iPhone and Mac on the same reliable network, or start a fresh
  Cloudflare Quick Tunnel.
- Use a native Expo development build—not Expo Go—for the RevenueCat Test Store
  purchase segment.
- Update `EXPO_PUBLIC_API_BASE_URL` with the current phone-reachable URL and
  restart Expo with `npm run start:clean`.
- Start FastAPI and open `/health` from Safari on the phone.
- Allow the first OpenCLIP model download to finish before the judged demo.
- Prepare a well-lit room containing three visually distinct objects, such as
  glasses, a blue mug, and keys.
- Keep one processed Ready memory as a fallback, while still demonstrating a
  fresh recording if time and connectivity allow.

## Suggested three-minute walkthrough

1. **Promise:** Show the FoundIt home screen and explain, “Your space remembers
   where you left it.”
2. **Capture:** Tap **Record a space**, sweep the room slowly, and stop before the
   30-second limit.
3. **Save:** Preview the video, name the room, and save it. Point out that the
   memory first stays on the phone.
4. **Prepare:** Open the saved memory, read the privacy notice, and choose
   **Upload for processing**. Explain frame sampling, blur filtering,
   deduplication, and OpenCLIP indexing while the job runs.
5. **Retrieve:** Open **Find something** and search for one clearly visible
   object. Show the strongest frame, room, saved time, frame timestamp,
   similarity score, and alternatives.
6. **Set expectations:** Explain that a result is where the object may have been
   last seen in the recording, not proof of its current location.

## RevenueCat segment

1. Open **FoundIt Plus** in the native development build.
2. Show the monthly package and RevenueCat-provided price from the current
   `default` offering.
3. Complete a Test Store purchase and show that Plus activates only after
   CustomerInfo contains the `foundit_plus` entitlement.
4. Prepare a second space to demonstrate the unlimited-space benefit.
5. State clearly that this is a Test Store transaction, not a real charge.

## Optional voice segment

Tap **Voice**, record a short question, stop, and show that the transcription is
placed into the existing text field for confirmation or editing. Search only
after reviewing the text.

Voice recording, cancellation, permission denial, multipart upload, and fake
Gemini transcription are covered by automated tests. Physical-iPhone voice
transcription has not yet been verified, so omit this segment from a judged demo
until that test passes.

## Verified status

- Camera permission, recording, preview, discard, and save: physically verified
- Durable local memory listing and playback: physically verified
- Text-based semantic retrieval: physically verified on iPhone on September 26,
  2026
- Voice transcription: automated tests only
- Weak/missing-object behavior: automated tests only
- RevenueCat Test Store purchase on a native development build: requires final
  physical-device verification

## Media checklist

Before submission, replace these placeholders with final assets:

- [ ] Home screen screenshot
- [ ] Recording screen screenshot
- [ ] Ready memory and retained frames screenshot
- [ ] Search result screenshot
- [ ] 60–90 second narrated demo video
- [ ] Captions or transcript for the demo video
