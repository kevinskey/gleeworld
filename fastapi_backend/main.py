import os
import tempfile
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

import librosa
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import asyncio
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(
    title="Singing Assessment API",
    description="AI-powered singing assessment with pitch detection and Supabase integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = "https://oopmlreysjzuxzylyheb.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Reference melodies for different voice ranges
VOICE_RANGES = {
    "soprano": {
        "melody": {
            "C4": 261.63,
            "D4": 293.66,
            "E4": 329.63,
            "F4": 349.23,
            "G4": 392.00
        },
        "sequence": [261.63, 293.66, 329.63, 349.23, 392.00],
        "notes": ["C4", "D4", "E4", "F4", "G4"],
        "min_freq": 200,
        "max_freq": 600
    },
    "alto": {
        "melody": {
            "G3": 196.00,
            "A3": 220.00,
            "B3": 246.94,
            "C4": 261.63,
            "D4": 293.66
        },
        "sequence": [196.00, 220.00, 246.94, 261.63, 293.66],
        "notes": ["G3", "A3", "B3", "C4", "D4"],
        "min_freq": 150,
        "max_freq": 450
    }
}

# Default reference (soprano)
REFERENCE_MELODY = VOICE_RANGES["soprano"]["melody"]
REFERENCE_SEQUENCE = VOICE_RANGES["soprano"]["sequence"]
REFERENCE_NOTES = VOICE_RANGES["soprano"]["notes"]

class PitchAnalysisResult(BaseModel):
    note_index: int
    expected_note: str
    expected_frequency: float
    detected_frequency: float
    detected_note: str
    is_accurate: bool
    frequency_difference: float
    confidence: float

class AssessmentResponse(BaseModel):
    score: int
    overall_percentage: float
    note_by_note_results: List[PitchAnalysisResult]
    detected_pitches_hz: List[float]
    reference_melody: Dict[str, List]
    user_id: str
    timestamp: datetime

def hz_to_note_name(frequency: float, voice_range: str = "soprano", tolerance: float = 50.0) -> str:
    """Convert frequency to closest note name within tolerance for the given voice range."""
    if frequency <= 0:
        return "Unknown"
    
    range_data = VOICE_RANGES.get(voice_range, VOICE_RANGES["soprano"])
    reference_melody = range_data["melody"]
    
    closest_note = "Unknown"
    min_diff = float('inf')
    
    for note, freq in reference_melody.items():
        diff = abs(frequency - freq)
        if diff < min_diff and diff <= tolerance:
            min_diff = diff
            closest_note = note
    
    return closest_note

def extract_pitch_contour(audio_data: np.ndarray, sr: int, voice_range: str = "soprano") -> List[float]:
    """
    Extract pitch contour using librosa's fundamental frequency estimation.
    Uses a combination of piptrack and yin algorithms for better accuracy.
    """
    try:
        # Get frequency range for voice type
        range_data = VOICE_RANGES.get(voice_range, VOICE_RANGES["soprano"])
        fmin = range_data["min_freq"]
        fmax = range_data["max_freq"]
        
        # Method 1: Use piptrack for pitch detection
        pitches, magnitudes = librosa.piptrack(
            y=audio_data, 
            sr=sr, 
            threshold=0.1,
            fmin=fmin,  # Voice-specific minimum frequency
            fmax=fmax   # Voice-specific maximum frequency
        )
        
        # Extract the strongest pitch at each time frame
        pitch_contour = []
        for t in range(pitches.shape[1]):
            # Find the pitch with highest magnitude
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            if pitch > 0:
                pitch_contour.append(pitch)
        
        # If piptrack doesn't return enough data, try yin algorithm
        if len(pitch_contour) < 10:
            try:
                # Use yin algorithm as backup
                f0 = librosa.yin(
                    audio_data, 
                    fmin=fmin, 
                    fmax=fmax, 
                    sr=sr,
                    frame_length=2048
                )
                pitch_contour = [freq for freq in f0 if freq > 0]
            except Exception as e:
                print(f"Yin algorithm failed: {e}")
                # Fallback to basic autocorrelation
                pitch_contour = extract_pitch_basic_autocorr(audio_data, sr, voice_range)
        
        return pitch_contour
        
    except Exception as e:
        print(f"Pitch extraction error: {e}")
        # Fallback to basic method
        return extract_pitch_basic_autocorr(audio_data, sr, voice_range)

def extract_pitch_basic_autocorr(audio_data: np.ndarray, sr: int, voice_range: str = "soprano") -> List[float]:
    """Fallback pitch detection using basic autocorrelation."""
    range_data = VOICE_RANGES.get(voice_range, VOICE_RANGES["soprano"])
    fmin = range_data["min_freq"]
    fmax = range_data["max_freq"]
    
    frame_length = int(0.1 * sr)  # 100ms frames
    hop_length = frame_length // 2
    
    pitches = []
    
    for i in range(0, len(audio_data) - frame_length, hop_length):
        frame = audio_data[i:i + frame_length]
        
        # Simple autocorrelation-based pitch detection
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        # Look for fundamental frequency in voice range
        min_period = int(sr / fmax)  # Max frequency
        max_period = int(sr / fmin)  # Min frequency
        
        if max_period < len(autocorr):
            search_range = autocorr[min_period:max_period]
            if len(search_range) > 0:
                peak_idx = np.argmax(search_range) + min_period
                frequency = sr / peak_idx if peak_idx > 0 else 0
                
                # Only keep frequencies in voice range
                if fmin <= frequency <= fmax:
                    pitches.append(frequency)
    
    return pitches

def segment_pitches_to_notes(pitches: List[float], voice_range: str = "soprano", num_expected_notes: int = 5) -> List[float]:
    """Segment continuous pitch contour into discrete notes."""
    if not pitches:
        return [0.0] * num_expected_notes
    
    # Get frequency range for voice type
    range_data = VOICE_RANGES.get(voice_range, VOICE_RANGES["soprano"])
    fmin = range_data["min_freq"]
    fmax = range_data["max_freq"]
    
    # Remove outliers (frequencies outside voice range)
    filtered_pitches = [p for p in pitches if fmin <= p <= fmax]
    
    if not filtered_pitches:
        return [0.0] * num_expected_notes
    
    # Simple segmentation: divide into equal time segments
    segment_size = len(filtered_pitches) // num_expected_notes
    if segment_size == 0:
        # If we have fewer pitches than expected notes, pad with zeros
        result = filtered_pitches[:num_expected_notes]
        while len(result) < num_expected_notes:
            result.append(0.0)
        return result
    
    segmented_notes = []
    for i in range(num_expected_notes):
        start_idx = i * segment_size
        end_idx = start_idx + segment_size if i < num_expected_notes - 1 else len(filtered_pitches)
        
        segment = filtered_pitches[start_idx:end_idx]
        if segment:
            # Use median pitch of segment as the note (more robust than mean)
            median_pitch = np.median(segment)
            segmented_notes.append(median_pitch)
        else:
            segmented_notes.append(0.0)
    
    return segmented_notes

def analyze_pitch_accuracy(detected: List[float], reference: List[float], reference_notes: List[str], voice_range: str = "soprano", tolerance: float = 50.0) -> Dict[str, Any]:
    """Analyze pitch accuracy with detailed results."""
    note_results = []
    detected_notes = []
    
    # Ensure detected list matches reference length
    detected_padded = detected[:len(reference)]
    while len(detected_padded) < len(reference):
        detected_padded.append(0.0)
    
    for i, (det, ref) in enumerate(zip(detected_padded, reference)):
        is_accurate = abs(det - ref) <= tolerance if det > 0 else False
        
        # Calculate confidence based on how close the pitch is
        confidence = 0.0
        if det > 0:
            diff = abs(det - ref)
            confidence = max(0.0, min(1.0, 1.0 - (diff / tolerance)))
        
        result = PitchAnalysisResult(
            note_index=i,
            expected_note=reference_notes[i],
            expected_frequency=ref,
            detected_frequency=det,
            detected_note=hz_to_note_name(det, voice_range),
            is_accurate=is_accurate,
            frequency_difference=det - ref if det > 0 else 0.0,
            confidence=confidence
        )
        
        note_results.append(result)
        detected_notes.append(det)
    
    # Calculate overall score
    accurate_count = sum(1 for result in note_results if result.is_accurate)
    overall_percentage = (accurate_count / len(reference)) * 100 if reference else 0
    score = int(overall_percentage)
    
    return {
        "score": score,
        "overall_percentage": overall_percentage,
        "note_by_note_results": note_results,
        "detected_pitches_hz": detected_notes,
        "reference_melody": {
            "notes": reference_notes,
            "frequencies_hz": reference,
            "voice_range": voice_range
        }
    }

async def store_results_in_supabase(user_id: str, score: int, results: Dict[str, Any]) -> bool:
    """Store assessment results in Supabase."""
    try:
        # Convert UUID string to proper format
        user_uuid = str(uuid.UUID(user_id))
        
        # Prepare data for insertion
        data = {
            "user_id": user_uuid,
            "score": score,
            "results": results
        }
        
        # Insert into Supabase
        response = supabase.table("pitch_results").insert(data).execute()
        
        if response.data:
            print(f"Successfully stored results for user {user_id}")
            return True
        else:
            print(f"Failed to store results: {response}")
            return False
            
    except Exception as e:
        print(f"Error storing results in Supabase: {e}")
        return False

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Singing Assessment API with Euphony Pitch Detection",
        "version": "1.0.0",
        "endpoints": {
            "grade_singing": "POST /grade_singing - Upload audio and get singing assessment",
            "health": "GET /health - API health check"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "supabase_url": SUPABASE_URL,
        "reference_melody": VOICE_RANGES
    }

@app.post("/grade_singing", response_model=AssessmentResponse)
async def grade_singing(
    file: UploadFile = File(..., description="Audio file (.wav, .mp3, or .m4a)"),
    user_id: str = Form(..., description="User ID for result storage"),
    voice_range: str = Form("soprano", description="Voice range: soprano or alto")
):
    """
    Grade singing performance against reference melody for specified voice range.
    
    - **file**: Audio file in .wav, .mp3, or .m4a format
    - **user_id**: UUID of the user submitting the recording
    - **voice_range**: Voice range - "soprano" (C4-G4) or "alto" (G3-D4)
    
    Returns detailed pitch analysis and stores results in Supabase.
    """
    
    # Validate file type
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.webm')):
        raise HTTPException(
            status_code=400, 
            detail="Only .wav, .mp3, .m4a, and .webm files are supported"
        )
    
    # Validate user_id format
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid user_id format. Must be a valid UUID."
        )
    
    # Validate voice range
    if voice_range not in VOICE_RANGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid voice_range. Must be one of: {list(VOICE_RANGES.keys())}"
        )
    
    # Get reference data for the selected voice range
    range_data = VOICE_RANGES[voice_range]
    reference_sequence = range_data["sequence"]
    reference_notes = range_data["notes"]
    
    try:
        # Read audio file
        audio_content = await file.read()
        
        # Save to temporary file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name
        
        try:
            # Load audio using librosa
            audio_data, sample_rate = librosa.load(temp_file_path, sr=None, mono=True)
            
            # Extract pitch contour
            pitch_contour = extract_pitch_contour(audio_data, sample_rate, voice_range)
            
            if not pitch_contour:
                raise HTTPException(
                    status_code=422,
                    detail="Could not detect any pitches in the audio. Please ensure the recording contains clear vocal content."
                )
            
            # Segment pitches into discrete notes
            detected_notes = segment_pitches_to_notes(pitch_contour, voice_range, num_expected_notes=5)
            
            # Analyze pitch accuracy
            analysis = analyze_pitch_accuracy(detected_notes, reference_sequence, reference_notes, voice_range, tolerance=50.0)
            
            # Store results in Supabase
            storage_successful = await store_results_in_supabase(
                user_id, 
                analysis["score"], 
                analysis
            )
            
            if not storage_successful:
                print("Warning: Failed to store results in Supabase, but continuing with response")
            
            # Prepare response
            response = AssessmentResponse(
                score=analysis["score"],
                overall_percentage=analysis["overall_percentage"],
                note_by_note_results=analysis["note_by_note_results"],
                detected_pitches_hz=analysis["detected_pitches_hz"],
                reference_melody=analysis["reference_melody"],
                user_id=user_id,
                timestamp=datetime.now()
            )
            
            return response
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing audio: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )