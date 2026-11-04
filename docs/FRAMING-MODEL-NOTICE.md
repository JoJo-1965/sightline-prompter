# Local framing model and runtime

The optional pre-record position feedback uses MediaPipe Tasks Vision 1.2.0
and Google's BlazeFace short-range model, version 1. Both are licensed under
Apache License 2.0. The original Apache licence accompanies the generated
runtime in `src/client/vision-runtime/LICENSE.txt` in packaged builds.

Model source:
https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite

SHA-256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`.

Model card and licence:
https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf

Runtime source: https://github.com/google-ai-edge/mediapipe

Camera frames are processed locally. The model locates face/eye features and
does not identify the person. It works best with one prominent, well-lit face
near the camera. Significant turning, occlusion, poor lighting or distance can
make tracking unavailable; manual guide adjustment remains available. The mask
approximates framing and does not trace hair or guarantee camera composition.
