# FoundIt processing API

This local FastAPI service accepts one saved room sweep, extracts useful frames,
indexes them for semantic text-to-frame search, and optionally transcribes a
short voice query. It does not perform object detection, bounding-box creation,
or location-description generation.

## Requirements and setup

- Python 3.11 or later
- FFmpeg and FFprobe available on `PATH`
- A Gemini API key for optional voice transcription

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
touch .env
uvicorn futurium_api.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

The ignored `backend/.env` may remain empty because configuration has
development defaults. Add overrides from the environment-variable table below
or a Gemini key for voice transcription when needed. No environment file is
tracked in Git.

`0.0.0.0` lets a phone on the same trusted LAN reach the development server.
There is no authentication in this prototype; do not expose it publicly.

The first real processing job downloads the configured OpenCLIP weights. Allow
extra time and network access for that first job. The model is lazily loaded
once and reused for image and text inference for the lifetime of the server.
Tests inject fakes and never download weights or contact Gemini.

## Endpoints

- `GET /health` — checks whether FFmpeg and FFprobe are available
- `POST /sweeps` — accepts multipart fields `sweep_id` and `video`, then returns
  HTTP 202 with the generated job manifest immediately after the bounded upload
  is saved
- `GET /sweeps/{job_id}` — returns the current processing manifest
- `GET /sweeps/{job_id}/thumbnails/{frame_id}.jpg` — serves retained thumbnails
- `POST /search` — embeds a text query and ranks ready, indexed frames from the
  requested job or sweep scope
- `POST /transcriptions` — accepts one bounded short-audio `audio` field and
  returns only the transcription

Upload an MP4, MOV, M4V or WebM:

```bash
curl -X POST http://localhost:8000/sweeps \
  -F "sweep_id=1" \
  -F "video=@/absolute/path/to/room-sweep.mov;type=video/quicktime"
```

Poll the job returned as `jobId`:

```bash
curl http://localhost:8000/sweeps/JOB_ID
```

Search one or more ready jobs (the response is capped at three candidates):

```bash
curl -X POST http://localhost:8000/search \
  -H "content-type: application/json" \
  -d '{
    "query": "Where are my glasses?",
    "jobIds": ["JOB_ID"],
    "resultLimit": 3
  }'
```

Transcribe a short voice query:

```bash
curl -X POST http://localhost:8000/transcriptions \
  -F "audio=@/absolute/path/to/query.m4a;type=audio/m4a"
```

Errors have a stable JSON shape:

```json
{
  "error": {
    "code": "unsupported_media_type",
    "message": "Upload an MP4, MOV, M4V, or WebM video."
  }
}
```

## Processing manifest

The camel-cased response includes:

- `jobId`, the generated server identifier
- `sweepId`, the mobile SQLite identifier supplied by the client
- `status`: `processing`, `ready` or `failed`
- `duration`, in seconds
- sampled, retained, blurry-rejected and duplicate-rejected frame counts
- retained frames with `frameId`, `timestamp` and `thumbnailUrl`
- `embeddingModel`, identifying the frame embedding model used for this job
- a structured `error` when processing fails

Client filenames are never used for storage. Job and frame identifiers are
validated before paths are resolved. Uploads are streamed in bounded chunks and
limited to 100 MiB by default.

After the upload completes, processing is detached from the POST response and
run in a worker thread with `asyncio.to_thread`. FFmpeg, FFprobe, and OpenCV do
not run on FastAPI's event-loop thread, so `GET /sweeps/{job_id}` can continue to
report `processing` while frame extraction is active. Structured JSON timing
logs cover upload completion, the point at which the 202 response is ready,
worker start and finish, and every status poll. Logs contain job metadata and
timings but never upload filenames or private filesystem paths.

## Frame selection

1. FFprobe reads the video duration.
2. FFmpeg's `fps` filter samples approximately two frames per second.
3. Each sample receives the timestamp `sample index / configured sample FPS`.
4. OpenCV converts the image to grayscale and calculates
   `variance(cv2.Laplacian(gray, cv2.CV_64F))`. A value below the configurable
   default threshold of `100` is treated as visibly blurry. This is an
   application heuristic, not a universal image-quality score, and should be
   tuned using representative phone footage.
5. A 64-bit difference hash is compared with the previous retained frame. A
   Hamming distance of `5` or less is treated as a near-duplicate by default.
6. Full retained JPEG frames and 320-pixel-wide thumbnails are stored.
7. Ready frames are embedded by OpenCLIP `ViT-B-32` using
   `laion2b_s34b_b79k` weights. Image embeddings are normalized before storage.

The temporary uploaded source is removed in a `finally` path whether processing
succeeds or fails. Temporary sampled frames are also deleted. Manifests,
retained frames, thumbnails, and embeddings remain under `FUTURIUM_DATA_DIR`
for semantic search. On a server restart, any job left in `processing` is recovered as
`failed`, its temporary upload is removed, and the mobile client can retry the
same saved memory.

## Semantic index and ranking

Each job receives an atomic, compressed `embeddings.npz` file containing:

- schema version `1`
- the exact OpenCLIP model identifier
- stable `frame_000001`-style frame IDs
- a two-dimensional normalized float32 embedding matrix

`POST /search` accepts a normalized query, either `jobIds` or `sweepIds`, and a
result limit from 1 to 3. Only jobs whose manifest status is `ready` are
searched. The text vector is normalized, cosine similarity is calculated as a
matrix dot product, and candidates are sorted by descending similarity with
stable job/frame tie-breaking. The default confidence threshold is `0.23`.
Scores below it still return reviewable visual candidates but set
`confidentMatch` to `false`; clients must not claim the object was found.

Existing ready jobs created before semantic indexing have no `embeddings.npz`
and are returned in `unindexedJobIds`. Reprocess those saved memories to index
them. The current system searches whole frames only and cannot localize an
object within a frame.

## Voice transcription and privacy

`POST /transcriptions` accepts M4A, MP3, AAC, WAV, OGG, or WebM audio and limits
the upload to 5 MiB by default. The route uses the injected `Transcriber`
interface; production uses Gemini `gemini-3.5-transcribe`, while tests use a
fake provider. The API never logs audio contents, transcripts, uploaded client
filenames, API keys, or private filesystem paths.

The server stores the incoming audio under a generated temporary name, uploads
it through Gemini's Files API, returns only a transcript of at most 200
characters, requests immediate deletion of the Gemini file, and removes the
local temporary file in a `finally` block whether transcription succeeds or
fails. Gemini credentials stay on the backend; they are never included in the
Expo bundle. This prototype does not claim end-to-end encryption or medical
compliance.

The `futurium_api` Python module, `futurium-api` distribution name, and
`FUTURIUM_*` environment-variable prefix are intentionally retained for
backward compatibility with existing development environments. They are
internal identifiers; the product and API title are FoundIt.

## Environment variables

| Variable                               |                 Default | Purpose                          |
| -------------------------------------- | ----------------------: | -------------------------------- |
| `FUTURIUM_DATA_DIR`                    |                `./data` | Manifest and retained-frame root |
| `FUTURIUM_MAX_UPLOAD_BYTES`            |             `104857600` | Maximum video upload bytes       |
| `FUTURIUM_SAMPLE_FPS`                  |                     `2` | Approximate samples per second   |
| `FUTURIUM_BLUR_THRESHOLD`              |                   `100` | Minimum Laplacian variance       |
| `FUTURIUM_DUPLICATE_HASH_DISTANCE`     |                     `5` | Maximum duplicate dHash distance |
| `FUTURIUM_THUMBNAIL_WIDTH`             |                   `320` | Thumbnail width in pixels        |
| `FUTURIUM_PROCESS_TIMEOUT_SECONDS`     |                   `180` | FFmpeg/FFprobe timeout           |
| `FUTURIUM_EMBEDDING_MODEL`             |              `ViT-B-32` | OpenCLIP architecture            |
| `FUTURIUM_EMBEDDING_PRETRAINED`        |     `laion2b_s34b_b79k` | OpenCLIP weight identifier       |
| `FUTURIUM_EMBEDDING_DEVICE`            |                  `auto` | MPS, CUDA, then CPU selection    |
| `FUTURIUM_SEARCH_CONFIDENCE_THRESHOLD` |                  `0.23` | Confident-match cutoff           |
| `GEMINI_API_KEY`                       |                       — | Server-only Gemini credential    |
| `FUTURIUM_GEMINI_TRANSCRIPTION_MODEL`  | `gemini-3.5-transcribe` | Voice transcription model        |
| `FUTURIUM_MAX_AUDIO_UPLOAD_BYTES`      |               `5242880` | Maximum voice upload bytes       |

## Tests and checks

```bash
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

The frame-selection fixture is generated from six synthetic frames at runtime.
With the default settings, the test asserts 6 sampled frames, 3 retained frames,
1 blur rejection and 2 consecutive-duplicate rejections. A second generated
video contains distinguishable glasses, mug, and keys frames; the injected fake
embedder verifies that “Where is my blue mug?” ranks the mug frame first. Voice
tests inject a fake transcriber and verify success, validation, provider failure,
and temporary-file cleanup. No fixture video is stored in Git, no model weights
are downloaded, and no Gemini request is sent by the test suite.
