# FoundIt

**Your space remembers where you left it.**

FoundIt gives physical spaces a searchable visual memory. I built it so a short room recording can become a practical record of where everyday objects were last visible.

[Watch the FoundIt demo](https://youtube.com/shorts/7yG1WsOOU2I)

### Why I built it

My grandmother is always looking for something she just put down. Her purse, her glasses, her keys. Sometimes the search ends quickly. Other times, it becomes stressful for everyone around her.

That made me wonder: what if the room could remember for her?

I built FoundIt as a supportive tool for families and caregivers. It does not diagnose, treat, or manage dementia.

### How it works

I record a short sweep of a room, name it, and save it as a memory. When I choose to prepare that memory, FoundIt keeps the clearest, most useful moments and makes them searchable.

Later, I can type or speak a question such as “Where are my EarPods?” FoundIt returns the strongest visual matches, including the room, when the memory was saved, and the matching moment in the recording.

FoundIt reports where an object may have been last seen. It does not claim that the object is still there.

### How I built it

I used Expo, React Native, Expo Router, and TypeScript for the mobile app, with SQLite storing local memory records and metadata. A FastAPI service written in Python handles preparation and search: FFmpeg samples frames, OpenCV filters blurry and near-duplicate images, and OpenCLIP creates visual embeddings for cosine-similarity search. Gemini provides optional voice transcription.

### RevenueCat Plus

RevenueCat controls a real product boundary in FoundIt. Free users can prepare one physical space and search memories already prepared. FoundIt Plus unlocks unlimited prepared spaces, with search across every prepared memory.

The app loads the current RevenueCat offering and its localised price. Purchases and restoration depend on RevenueCat CustomerInfo, and Plus unlocks only when RevenueCat returns the active `foundit_plus` entitlement. I successfully tested the Test Store purchase flow on a physical iPhone.

### What worked and what did not

In a physical test, FoundIt successfully found EarPods, a mouse, and a pen. It missed a pair of glasses because they occupied only a small part of the frame.

The current system compares whole frames. Region-level embeddings or object detection are the next technical step for retrieving smaller objects more reliably.

### Privacy and responsible use

- Room videos remain in private device storage until the user chooses processing.
- Temporary uploaded videos are deleted after processing.
- Temporary voice recordings are deleted after transcription.
- Retained frames and embeddings remain available for search.
- FoundIt is a hackathon prototype.
- The development backend does not yet have production authentication.
- FoundIt must not be treated as a medical or safety-critical system.

### Run locally

Install the mobile dependencies:

```bash
npm ci
```

Create and prepare the Python environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
```

Add the phone-reachable API URL and RevenueCat public SDK key to a root `.env` file:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com
EXPO_PUBLIC_REVENUECAT_API_KEY=test_your_public_sdk_key
```

Start FastAPI from `backend/`:

```bash
uvicorn futurium_api.main:app --host 0.0.0.0 --port 8000 --reload
```

Then start the app from the repository root:

```bash
npm run start:clean
```

See [backend/README.md](backend/README.md) for detailed backend setup and testing.

### What is next

I want to improve small-object retrieval, move more processing onto the device, and explore the long-term idea of a lightweight wearable memory assistant.

FoundIt is the first step: proof that a physical space can remember.

### Hackathon

I’m Temiloluwa Valentine, and I built FoundIt solo for RevenueCat Ship-a-ton 2026.

### License

FoundIt is available under the [MIT License](LICENSE).
