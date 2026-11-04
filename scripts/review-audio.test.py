"""Run with the optional local review Python runtime, not the npm CI suite."""
import importlib.util
from pathlib import Path
import numpy as np

spec = importlib.util.spec_from_file_location("review", Path(__file__).parent.parent / "src/recording-review-worker.py")
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)
rng = np.random.default_rng(42)
rate = 16000
reference = rng.normal(0, 0.1, 35 * rate).astype(np.float32)
at = round(1.237 * rate)
media = reference[at:at + 25 * rate]
result = worker.correlate_audio(reference, media, 12.3)
assert result["status"] == "measured", result
assert abs(result["sessionOffsetS"] - 13.537) < 1 / rate
assert len(result["checks"]) == 3
assert result["pictureSync"] == "unverified"
assert worker.correlate_audio(reference, -media, 12.3)["status"] == "measured"
noise = rng.normal(0, 0.1, 25 * rate).astype(np.float32)
assert worker.correlate_audio(reference, noise, 12.3)["status"] == "uncertain"
repeated = np.tile(reference[:rate], 35)
assert worker.correlate_audio(repeated, repeated[:25 * rate], 0)["status"] == "uncertain"
assert worker.correlate_audio(reference, np.zeros(25 * rate, dtype=np.float32), 0)["status"] == "unavailable"
shifted = np.r_[reference[rate:11 * rate], reference[round(11.1 * rate):round(21.1 * rate)], reference[round(21.2 * rate):round(26.2 * rate)]]
assert worker.correlate_audio(reference, shifted, 0)["status"] == "uncertain"
print("PASS: known offset, polarity, unrelated noise, repeated audio, silence and discontinuity; picture sync never inferred")
