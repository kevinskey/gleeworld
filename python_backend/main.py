from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import numpy as np
import json
from typing import List, Dict, Any
import io

# For pitch detection, we'll use a simple approach with numpy/scipy
# In production, you'd want to use a proper pitch detection library
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    print("Librosa not available, using basic pitch detection")

app = FastAPI(title="Singing Assessment API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reference melody: C4, D4, E4, F4, G4 in Hz
REFERENCE_MELODY = {
    "C4": 261.63,
    "D4": 293.66,
    "E4": 329.63,
    "F4": 349.23,
    "G4": 392.00
}

REFERENCE_SEQUENCE = [261.63, 293.66, 329.63, 349.23, 392.00]

def hz_to_note_name(frequency: float, tolerance: float = 50.0) -> str:
    """Convert frequency to closest note name within tolerance."""
    if frequency <= 0:
        return "Unknown"
    
    closest_note = "Unknown"
    min_diff = float('inf')
    
    for note, freq in REFERENCE_MELODY.items():
        diff = abs(frequency - freq)
        if diff < min_diff and diff <= tolerance:
            min_diff = diff
            closest_note = note
    
    return closest_note

def extract_pitch_contour_basic(audio_data: np.ndarray, sr: int) -> List[float]:
    """Basic pitch detection using autocorrelation."""
    # Simple frame-based pitch detection
    frame_length = int(0.1 * sr)  # 100ms frames
    hop_length = frame_length // 2
    
    pitches = []
    
    for i in range(0, len(audio_data) - frame_length, hop_length):
        frame = audio_data[i:i + frame_length]
        
        # Simple autocorrelation-based pitch detection
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        # Find peaks in autocorrelation
        # Look for fundamental frequency between 80Hz and 800Hz
        min_period = int(sr / 800)  # Max 800Hz
        max_period = int(sr / 80)   # Min 80Hz
        
        if max_period < len(autocorr):
            search_range = autocorr[min_period:max_period]
            if len(search_range) > 0:
                peak_idx = np.argmax(search_range) + min_period
                frequency = sr / peak_idx if peak_idx > 0 else 0
                
                # Only keep reasonable vocal frequencies
                if 80 <= frequency <= 800:
                    pitches.append(frequency)
    
    return pitches

def extract_pitch_contour_librosa(audio_data: np.ndarray, sr: int) -> List[float]:
    """Extract pitch contour using librosa."""
    # Use librosa's piptrack for pitch detection
    pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sr, threshold=0.1)
    
    # Extract the strongest pitch at each time frame
    pitch_contour = []
    for t in range(pitches.shape[1]):
        index = magnitudes[:, t].argmax()
        pitch = pitches[index, t]
        if pitch > 0:
            pitch_contour.append(pitch)
    
    return pitch_contour

def segment_pitches_to_notes(pitches: List[float], num_expected_notes: int = 5) -> List[float]:
    """Segment continuous pitch contour into discrete notes."""
    if not pitches:
        return []
    
    # Simple segmentation: divide into equal time segments
    segment_size = len(pitches) // num_expected_notes
    if segment_size == 0:
        return pitches[:num_expected_notes]
    
    segmented_notes = []
    for i in range(num_expected_notes):
        start_idx = i * segment_size
        end_idx = start_idx + segment_size if i < num_expected_notes - 1 else len(pitches)
        
        segment = pitches[start_idx:end_idx]
        if segment:
            # Use median pitch of segment as the note
            median_pitch = np.median(segment)
            segmented_notes.append(median_pitch)
    
    return segmented_notes

def compare_pitches(detected: List[float], reference: List[float], tolerance: float = 50.0) -> Dict[str, Any]:
    """Compare detected pitches to reference melody."""
    note_accuracy = []
    detected_notes = []
    
    # Pad or trim to match reference length
    detected_padded = detected[:len(reference)]
    while len(detected_padded) < len(reference):
        detected_padded.append(0.0)
    
    for i, (det, ref) in enumerate(zip(detected_padded, reference)):
        is_accurate = abs(det - ref) <= tolerance if det > 0 else False
        note_accuracy.append({
            "note_index": i,
            "expected_note": hz_to_note_name(ref),
            "expected_frequency": ref,
            "detected_frequency": det,
            "detected_note": hz_to_note_name(det),
            "is_accurate": is_accurate,
            "frequency_difference": det - ref if det > 0 else None
        })
        detected_notes.append(det)
    
    # Calculate overall score
    accurate_count = sum(1 for note in note_accuracy if note["is_accurate"])
    overall_score = (accurate_count / len(reference)) * 100 if reference else 0
    
    return {
        "note_by_note_accuracy": note_accuracy,
        "overall_percentage_score": round(overall_score, 2),
        "detected_pitches_hz": detected_notes,
        "detected_pitches_midi": [round(12 * np.log2(f / 440.0) + 69) if f > 0 else 0 for f in detected_notes],
        "reference_melody": {
            "notes": ["C4", "D4", "E4", "F4", "G4"],
            "frequencies_hz": REFERENCE_SEQUENCE
        }
    }

@app.get("/")
async def root():
    return {"message": "Singing Assessment API", "status": "running"}

@app.post("/grade_singing")
async def grade_singing(file: UploadFile = File(...)):
    """
    Grade singing performance against reference melody C4-D4-E4-F4-G4.
    
    Accepts .wav or .mp3 audio files and returns pitch accuracy assessment.
    """
    
    # Validate file type
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(
            status_code=400, 
            detail="Only .wav, .mp3, and .m4a files are supported"
        )
    
    try:
        # Read audio file
        audio_content = await file.read()
        
        # Save to temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name
        
        try:
            if LIBROSA_AVAILABLE:
                # Load audio using librosa
                audio_data, sample_rate = librosa.load(temp_file_path, sr=None, mono=True)
                pitch_contour = extract_pitch_contour_librosa(audio_data, sample_rate)
            else:
                # Fallback to basic processing (requires manual audio loading)
                raise HTTPException(
                    status_code=500,
                    detail="Advanced audio processing not available. Please install librosa."
                )
            
            # Segment pitches into discrete notes
            detected_notes = segment_pitches_to_notes(pitch_contour, num_expected_notes=5)
            
            # Compare to reference melody
            assessment = compare_pitches(detected_notes, REFERENCE_SEQUENCE, tolerance=50.0)
            
            return assessment
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "librosa_available": LIBROSA_AVAILABLE,
        "reference_melody": REFERENCE_MELODY
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)