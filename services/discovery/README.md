# UMEED Discovery Crawler Service (Phase 8)

This directory is reserved for the independent Python/FastAPI social distress discovery crawler.

### Architecture Overview
- **Framework**: FastAPI + Python 3.14
- **Media Pipeline**: FFmpeg (frame sampling & audio extraction)
- **Vision & Text Interpretation**: Gemini Multimodal / Qwen2.5-VL
- **Speech Extraction**: OpenAI Whisper
- **OCR**: PaddleOCR
- **Location Extraction**: OpenStreetMap Nominatim
- **Output Contract**: Validated UMEED Canonical Incident payload pushed to `POST /api/incidents/ingest`.

*Note: Scheduled for implementation in Phase 8 after the core case coordination workflow is operational.*

