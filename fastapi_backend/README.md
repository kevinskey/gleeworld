# Singing Assessment FastAPI Backend

A comprehensive FastAPI service that analyzes singing audio recordings using advanced pitch detection and stores results in Supabase.

## Features

- **Advanced Pitch Detection**: Uses librosa's piptrack and yin algorithms with fallback to autocorrelation
- **Reference Melody**: Compares against C4-D4-E4-F4-G4 sequence
- **Supabase Integration**: Automatically stores assessment results with user tracking
- **Detailed Analysis**: Provides note-by-note accuracy, confidence scores, and overall percentage
- **Multiple Audio Formats**: Supports .wav, .mp3, .m4a, and .webm files
- **Robust Error Handling**: Graceful fallbacks and comprehensive error messages

## Installation

1. **Create a Python virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
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

Upload an audio file and user ID for comprehensive singing assessment.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Form Fields:
  - `file`: Audio file (.wav, .mp3, .m4a, or .webm)
  - `user_id`: UUID string identifying the user

**Example using curl:**
```bash
curl -X POST "http://localhost:8000/grade_singing" \
  -F "file=@recording.wav" \
  -F "user_id=550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "score": 85,
  "overall_percentage": 85.0,
  "note_by_note_results": [
    {
      "note_index": 0,
      "expected_note": "C4",
      "expected_frequency": 261.63,
      "detected_frequency": 265.2,
      "detected_note": "C4",
      "is_accurate": true,
      "frequency_difference": 3.57,
      "confidence": 0.93
    }
  ],
  "detected_pitches_hz": [265.2, 295.1, 330.5, 345.8, 395.2],
  "reference_melody": {
    "notes": ["C4", "D4", "E4", "F4", "G4"],
    "frequencies_hz": [261.63, 293.66, 329.63, 349.23, 392.0]
  },
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-06T10:30:00"
}
```

### GET /health

Check service health and configuration.

### GET /

Root endpoint with service information and available endpoints.

## Algorithm Details

### Pitch Detection Pipeline

1. **Primary Method**: librosa.piptrack()
   - Robust fundamental frequency estimation
   - Configurable frequency range (80-800 Hz for vocals)
   - Magnitude-weighted pitch selection

2. **Fallback Method**: librosa.yin()
   - Alternative algorithm for difficult audio
   - Better performance on noisy recordings

3. **Final Fallback**: Basic autocorrelation
   - Simple correlation-based pitch detection
   - Ensures functionality even with challenging audio

### Analysis Process

1. **Audio Loading**: librosa loads and normalizes audio to mono
2. **Pitch Extraction**: Multi-algorithm approach for robustness
3. **Segmentation**: Divides pitch contour into 5 equal time segments
4. **Note Mapping**: Uses median pitch per segment for stability
5. **Accuracy Assessment**: 50Hz tolerance with confidence scoring
6. **Database Storage**: Automatic Supabase integration

## Supabase Integration

### Database Schema

The API automatically stores results in the `pitch_results` table:

```sql
CREATE TABLE pitch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Row Level Security

- Users can only view their own results
- Admins can view all results
- Automatic user association via UUID

## Configuration

### Supabase Settings

The API connects to:
- **URL**: `https://oopmlreysjzuxzylyheb.supabase.co`
- **Database**: Automatic table creation and RLS policies
- **Authentication**: Uses anon key for initial connections

### Reference Melody

The system evaluates against:
- **C4**: 261.63 Hz
- **D4**: 293.66 Hz  
- **E4**: 329.63 Hz
- **F4**: 349.23 Hz
- **G4**: 392.00 Hz

### Accuracy Tolerance

- **Default**: 50Hz deviation allowed
- **Confidence**: Calculated based on proximity to target frequency
- **Scoring**: Percentage based on accurate notes

## Integration Examples

### JavaScript/React Frontend

```javascript
const assessSinging = async (audioFile, userId) => {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('user_id', userId);
  
  const response = await fetch('http://localhost:8000/grade_singing', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};
```

### Python Client

```python
import requests

def assess_singing(audio_file_path, user_id):
    with open(audio_file_path, 'rb') as f:
        files = {'file': f}
        data = {'user_id': user_id}
        
        response = requests.post(
            'http://localhost:8000/grade_singing',
            files=files,
            data=data
        )
        
    return response.json()
```

## Error Handling

The API provides comprehensive error messages for:

- **Invalid file formats**: Clear guidance on supported formats
- **Missing audio content**: Detection of silent or corrupted files
- **Invalid user IDs**: UUID format validation
- **Database connection issues**: Graceful degradation with warnings
- **Processing failures**: Detailed error descriptions

## Performance Notes

- **Audio Processing**: Optimized librosa parameters for real-time performance
- **Memory Management**: Automatic cleanup of temporary files
- **Concurrent Requests**: FastAPI's async support for multiple simultaneous assessments
- **Database Efficiency**: Optimized queries with proper indexing

## Development

### Running in Development Mode

```bash
uvicorn main:app --reload --log-level debug
```

### API Documentation

Visit `http://localhost:8000/docs` for interactive Swagger documentation.

### Testing

```bash
# Test with sample audio file
curl -X POST "http://localhost:8000/grade_singing" \
  -F "file=@test_audio.wav" \
  -F "user_id=$(uuidgen | tr '[:upper:]' '[:lower:]')"
```