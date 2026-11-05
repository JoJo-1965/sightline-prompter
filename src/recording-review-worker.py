"""Optional local audio analysis. One JSON request on stdin; NDJSON on stdout.

Never writes input media or logs. Model download is a separate explicit action.
Dependencies live in the user's chosen Python environment, outside the app.
"""
import json
import sys
import os


def emit(kind, **data):
    print(json.dumps({"type": kind, **data}, allow_nan=False), flush=True)


def read_audio(file, sampling_rate=16000):
    import av
    import numpy as np
    blocks = []
    count = 0
    with av.open(file) as container:
        resampler = av.AudioResampler(format="s16", layout="mono", rate=sampling_rate)
        for frame in container.decode(audio=0):
            for converted in resampler.resample(frame):
                block = converted.to_ndarray().reshape(-1)
                count += len(block)
                if count > sampling_rate * 5400:
                    raise ValueError("RC1 review supports files up to 90 minutes; select a shorter segment")
                blocks.append(block)
        for converted in resampler.resample(None):
            blocks.append(converted.to_ndarray().reshape(-1))
    if not blocks:
        raise ValueError("The selected file has no decodable audio")
    return np.concatenate(blocks).astype(np.float32) / 32768.0


def correlate_audio(reference, media, reference_start, clock_uncertainty=0.05):
    import numpy as np
    from scipy.signal import correlate
    rate = 16000
    duration = len(media) / rate
    window = min(10.0, duration / 5)
    if window < 1.5 or len(reference) < window * rate:
        raise ValueError("Not enough overlapping audio for three sync checks")
    points = []
    for fraction in (0.15, 0.5, 0.85):
        at = round((duration - window) * fraction * rate)
        segment = media[at:at + round(window * rate)]
        if float(np.std(segment)) < 0.00005:
            continue
        # Coarse search over the full scratch track, followed by sample-level
        # refinement nearby. Normalise each candidate window, not the whole file.
        def search(signal, pattern):
            signal = signal.astype(np.float64)
            pattern = pattern.astype(np.float64)
            pattern -= np.mean(pattern)
            n = len(pattern)
            sums = np.r_[0.0, np.cumsum(signal)]
            squares = np.r_[0.0, np.cumsum(signal * signal)]
            energy = np.maximum(squares[n:] - squares[:-n] - (sums[n:] - sums[:-n]) ** 2 / n, 0)
            denominator = np.sqrt(energy * np.sum(pattern * pattern))
            raw = correlate(signal, pattern, mode="valid", method="fft")
            return np.divide(raw, denominator, out=np.zeros_like(raw), where=denominator > 1e-10)
        coarse = np.abs(search(reference[::4], segment[::4]))
        peak = int(np.argmax(coarse))
        other = coarse.copy()
        other[max(0, peak - 2000):peak + 2001] = 0
        second = float(np.max(other)) if len(other) else 0.0
        begin = max(0, peak * 4 - 1600)
        end = min(len(reference), peak * 4 + len(segment) + 1600)
        refined = np.abs(search(reference[begin:end], segment))
        lag = begin + int(np.argmax(refined))
        score = float(np.max(refined))
        points.append({"mediaTimeS": at / rate, "sessionOffsetS": reference_start + lag / rate - at / rate,
                       "correlation": round(score, 5), "alternativePeak": round(second, 5),
                       "distinctPeak": float(coarse[peak]) - second >= 0.08})
        emit("progress", message=f"Compared audio at {at / rate:.1f} seconds")
    if not points:
        return {"status": "unavailable", "reason": "No usable audio windows", "pictureSync": "unverified"}
    offsets = [p["sessionOffsetS"] for p in points]
    drift = max(offsets) - min(offsets)
    accepted = len(points) == 3 and drift <= 0.04 and all(p["correlation"] >= 0.55 and p["distinctPeak"] for p in points)
    return {"status": "measured" if accepted else "uncertain", "method": "normalised-waveform-correlation",
            "confidence": "high" if accepted else "low", "sessionOffsetS": float(np.median(offsets)) if accepted else None,
            "candidateOffsetS": float(np.median(offsets)), "driftS": round(drift, 6),
            "uncertaintyS": clock_uncertainty + max(0.005, drift / 2) if accepted else None,
            "checks": points, "pictureSync": "unverified", "sampleRate": rate}


def run(job):
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    from importlib.metadata import version
    if job["action"] == "check":
        import faster_whisper
        import scipy
        from faster_whisper.utils import download_model
        try:
            download_model("small.en", cache_dir=job["cache"], local_files_only=True, use_auth_token=False)
            model_ready = True
        except Exception:
            model_ready = False
        return {"engine": "faster-whisper", "version": version("faster-whisper"), "scipy": scipy.__version__, "modelReady": model_ready}
    cache = job["cache"]
    if job["action"] == "download":
        from faster_whisper.utils import download_model
        emit("progress", message="Downloading small.en for local transcription; audio is not uploaded")
        location = download_model("small.en", cache_dir=cache, use_auth_token=False)
        return {"model": "small.en", "ready": True, "location": location}
    # No network during transcription or sync. Token lookup is disabled too.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    if job["action"] == "sync":
        emit("progress", message="Reading the two selected soundtracks locally")
        reference = read_audio(job["reference"])
        media = read_audio(job["file"])
        return correlate_audio(reference, media, float(job["referenceStartS"]), float(job.get("clockUncertaintyS", 0.05)))
    if job["action"] != "transcribe":
        raise ValueError("Unknown analysis action")
    from faster_whisper import WhisperModel
    emit("progress", message="Loading the local small.en model")
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4,
                         download_root=cache, local_files_only=True, use_auth_token=False)
    audio = read_audio(job["file"])
    segments, info = model.transcribe(audio, language="en", word_timestamps=True,
                                      beam_size=5, vad_filter=True, condition_on_previous_text=False)
    words = []
    for segment in segments:
        words.extend({"word": w.word.strip(), "start": round(w.start, 4), "end": round(w.end, 4),
                      "probability": round(w.probability, 4)} for w in segment.words or [])
        emit("progress", message=f"Transcribed through {segment.end:.1f} seconds")
    return {"engine": "faster-whisper", "engineVersion": version("faster-whisper"), "model": "small.en",
            "language": info.language, "durationS": info.duration, "words": words,
            "timingSource": "post-record-transcription", "reviewed": False}


if __name__ == "__main__":
    try:
        request = json.loads(sys.stdin.readline())
        emit("result", result=run(request))
    except Exception as error:
        emit("error", message=str(error))
        sys.exit(1)
