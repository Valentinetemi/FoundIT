# FoundIt backend

This is the FastAPI service behind FoundIt. It turns a saved room sweep into a small set of searchable moments and can optionally transcribe a short voice query.

The service samples frames from a video, removes blurry and repetitive images, creates OpenCLIP embeddings, and searches those embeddings with a text question. It does not detect objects, draw bounding boxes, or generate descriptions of where an item is located.

### Quick start

You will need Python 3.11 or later, plus FFmpeg and FFprobe on your `PATH`. A Gemini API key is only needed for voice transcription.

From the `backend` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev]"
touch .env
uvicorn futurium_api.main:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

The `.env` file can stay empty because the service has development defaults. Add `GEMINI_API_KEY` if you want voice transcription, or use the configuration options below when you need to change processing behavior.

Binding to `0.0.0.0` lets a phone on the same trusted network reach the service. This development backend does not have authentication, so do not expose it publicly.

The first real processing job downloads the configured OpenCLIP weights and may take longer than later jobs. The model is loaded once and reused while the server is running.

### API

- `GET /health` checks whether FFmpeg and FFprobe are available.
- `POST /sweeps` accepts a saved room video and starts a processing job.
- `GET /sweeps/{job_id}` returns the latest processing status and manifest.
- `GET /sweeps/{job_id}/thumbnails/{frame_id}.jpg` returns a retained thumbnail.
- `POST /search` searches ready memories with a text query.
- `POST /transcriptions` transcribes a short voice recording.

#### Prepare a room sweep

Upload an MP4, MOV, M4V, or WebM file with the mobile memory ID in `sweep_id`:

```bash
curl -X POST http://localhost:8000/sweeps \
  -F "sweep_id=1" \
  -F "video=@/absolute/path/to/room-sweep.mov;type=video/quicktime"
```

The server saves the bounded upload, returns HTTP 202 with a `jobId`, and continues processing in a worker thread. Poll that job until its status becomes `ready` or `failed`:

```bash
curl http://localhost:8000/sweeps/JOB_ID
```

The manifest contains the mobile sweep ID, duration, processing status, sampling counts, retained frames, timestamps, thumbnail URLs, embedding model, and a structured error when something fails.

#### Search prepared memories

Search one or more ready jobs with a natural-language question:

```bash
curl -X POST http://localhost:8000/search \
  -H "content-type: application/json" \
  -d '{
    "query": "Where are my glasses?",
    "jobIds": ["JOB_ID"],
    "resultLimit": 3
  }'
```

You can send either `jobIds` or `sweepIds`. The result limit must be between one and three.

#### Transcribe a voice query

Voice input accepts M4A, MP3, AAC, WAV, OGG, or WebM audio:

```bash
curl -X POST http://localhost:8000/transcriptions \
  -F "audio=@/absolute/path/to/query.m4a;type=audio/m4a"
```

The response contains only the transcript. If Gemini is not configured, the endpoint returns a structured configuration error.

All API errors use the same shape:

```json
{
  "error": {
    "code": "unsupported_media_type",
    "message": "Upload an MP4, MOV, M4V, or WebM video."
  }
}
```

### What happens during processing

1. FFprobe reads the video duration.
2. FFmpeg samples about two frames per second by default.
3. OpenCV rejects visibly blurry frames using Laplacian variance.
4. A difference hash removes consecutive frames that are nearly identical.
5. The service stores the retained JPEGs and smaller thumbnails.
6. OpenCLIP embeds each retained frame for text-to-image search.

The blur threshold and duplicate distance are practical heuristics, not universal image-quality rules. They can be tuned through environment variables for different cameras and rooms.

The temporary uploaded video and sampled working frames are deleted whether processing succeeds or fails. Retained frames, thumbnails, manifests, and embeddings remain under `FUTURIUM_DATA_DIR` so the memory stays searchable.

If the server restarts during a job, that job is recovered as `failed`, its temporary upload is removed, and the mobile app can prepare the saved memory again.

### How search works

Each ready job has a compressed `embeddings.npz` index containing normalized OpenCLIP image vectors. A search question is embedded with the same model, normalized, and compared with those vectors using cosine similarity.

Candidates are ranked from strongest to weakest. The default confidence threshold is `0.23`; lower-scoring frames can still be returned for review, but `confidentMatch` is set to `false` so the app does not claim the object was found.

FoundIt currently compares whole frames. It cannot identify the precise region containing an object, which is why small objects can be difficult to retrieve.

### Voice and privacy

Voice uploads are limited to 5 MiB by default. The server saves an upload under a generated temporary name, sends it to Gemini, returns a transcript of at most 200 characters, asks Gemini to delete its copy, and removes the local file whether transcription succeeds or fails.

Gemini credentials stay on the backend and are never included in the Expo app. The API does not log room video, audio contents, transcripts, embeddings, credentials, client filenames, or private file paths.

Client filenames are not used for storage, job and frame identifiers are validated, and video uploads are limited to 100 MiB by default. This is still a hackathon prototype: it does not claim end-to-end encryption, medical compliance, or production-ready security.

The internal names `futurium_api`, `futurium-api`, and `FUTURIUM_*` remain for compatibility with existing development environments. The product name is FoundIt.

### Configuration

| Variable                               |                 Default | Purpose                       |
| -------------------------------------- | ----------------------: | ----------------------------- |
| `FUTURIUM_DATA_DIR`                    |                `./data` | Retained processing data      |
| `FUTURIUM_MAX_UPLOAD_BYTES`            |             `104857600` | Maximum video upload size     |
| `FUTURIUM_SAMPLE_FPS`                  |                     `2` | Frames sampled per second     |
| `FUTURIUM_BLUR_THRESHOLD`              |                   `100` | Minimum Laplacian variance    |
| `FUTURIUM_DUPLICATE_HASH_DISTANCE`     |                     `5` | Near-duplicate dHash distance |
| `FUTURIUM_THUMBNAIL_WIDTH`             |                   `320` | Thumbnail width in pixels     |
| `FUTURIUM_PROCESS_TIMEOUT_SECONDS`     |                   `180` | FFmpeg and FFprobe timeout    |
| `FUTURIUM_EMBEDDING_MODEL`             |              `ViT-B-32` | OpenCLIP architecture         |
| `FUTURIUM_EMBEDDING_PRETRAINED`        |     `laion2b_s34b_b79k` | OpenCLIP weights              |
| `FUTURIUM_EMBEDDING_DEVICE`            |                  `auto` | MPS, CUDA, then CPU selection |
| `FUTURIUM_SEARCH_CONFIDENCE_THRESHOLD` |                  `0.23` | Confident-match threshold     |
| `GEMINI_API_KEY`                       |                       — | Server-only Gemini credential |
| `FUTURIUM_GEMINI_TRANSCRIPTION_MODEL`  | `gemini-3.5-transcribe` | Voice transcription model     |
| `FUTURIUM_MAX_AUDIO_UPLOAD_BYTES`      |               `5242880` | Maximum voice upload size     |

### Tests

Run the backend checks from this directory:

```bash
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

The tests generate their own short videos, use fake embedding and transcription providers, and do not download model weights or contact Gemini. They cover frame filtering, background processing, cleanup, semantic ranking, low-confidence results, upload validation, voice transcription, and structured failures.
