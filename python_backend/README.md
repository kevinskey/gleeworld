# Singing Assessment FastAPI Backend

A FastAPI service that analyzes singing audio recordings and compares them to a reference melody (C4-D4-E4-F4-G4).

## Features

- **Audio Upload**: Accepts .wav, .mp3, and .m4a files
- **Pitch Detection**: Uses librosa for professional pitch extraction
- **Note Comparison**: Compares detected pitches to reference melody
- **Detailed Assessment**: Returns note-by-note accuracy and overall score

## Installation

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### POST /grade_singing

Upload an audio file for singing assessment.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Audio file (.wav, .mp3, or .m4a)

**Response:**
```json
{
  "note_by_note_accuracy": [
    {
      "note_index": 0,
      "expected_note": "C4",
      "expected_frequency": 261.63,
      "detected_frequency": 265.2,
      "detected_note": "C4",
      "is_accurate": true,
      "frequency_difference": 3.57
    }
  ],
  "overall_percentage_score": 80.0,
  "detected_pitches_hz": [265.2, 295.1, 330.5, 345.8, 395.2],
  "detected_pitches_midi": [60, 62, 64, 65, 67],
  "reference_melody": {
    "notes": ["C4", "D4", "E4", "F4", "G4"],
    "frequencies_hz": [261.63, 293.66, 329.63, 349.23, 392.0]
  }
}
```

### GET /health

Check service health and configuration.

### GET /

Root endpoint with service information.

## Algorithm Details

1. **Audio Loading**: Uses librosa to load and normalize audio
2. **Pitch Detection**: Employs librosa's piptrack algorithm for robust pitch extraction
3. **Segmentation**: Divides pitch contour into 5 equal time segments (one per expected note)
4. **Comparison**: Compares median pitch of each segment to reference frequencies
5. **Tolerance**: 50Hz tolerance for pitch matching (configurable)

## Reference Melody

The system compares against a C major scale sequence:
- C4: 261.63 Hz
- D4: 293.66 Hz  
- E4: 329.63 Hz
- F4: 349.23 Hz
- G4: 392.00 Hz

## Integration with React App

The FastAPI service can be called from your React application:

```typescript
const assessSinging = async (audioFile: File) => {
  const formData = new FormData();
  formData.append('file', audioFile);
  
  const response = await fetch('http://localhost:8000/grade_singing', {
    method: 'POST',
    body: formData,
  });
  
  return await response.json();
};
```