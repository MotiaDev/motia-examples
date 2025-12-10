#!/usr/bin/env python3
"""
Whisper Transcription Script for Motia Meeting Transcription Example

This script processes audio files using OpenAI Whisper and outputs transcripts
in a format suitable for Motia pipeline processing.
"""

import sys
import os
import json
import whisper
import librosa
from pathlib import Path
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhisperTranscriber:
    """Handles audio transcription using OpenAI Whisper"""
    
    def __init__(self, model_name: str = "base"):
        """
        Initialize the transcriber with specified model
        
        Args:
            model_name: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
        """
        self.model_name = model_name
        self.model = None
        # Updated to include MP4 files (Teams recordings)
        self.supported_formats = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4']
        
    def load_model(self):
        """Load the Whisper model (lazy loading)"""
        if self.model is None:
            logger.info(f"Loading Whisper model: {self.model_name}")
            try:
                self.model = whisper.load_model(self.model_name)
                logger.info("Model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise
    
    def get_audio_duration(self, file_path: str) -> float:
        """Get audio file duration in seconds"""
        try:
            duration = librosa.get_duration(path=file_path)
            return duration
        except Exception as e:
            logger.warning(f"Could not get duration for {file_path}: {e}")
            return 0.0
    
    def validate_file(self, file_path: str) -> bool:
        """Validate that the file exists and is supported"""
        if not os.path.exists(file_path):
            logger.error(f"File does not exist: {file_path}")
            return False
            
        file_ext = Path(file_path).suffix.lower()
        if file_ext not in self.supported_formats:
            logger.error(f"Unsupported file format: {file_ext}")
            return False
            
        return True
    
    def transcribe_file(self, file_path: str) -> Dict[str, Any]:
        """Transcribe a single audio file"""
        if not self.validate_file(file_path):
            return {
                'filename': Path(file_path).name,
                'success': False,
                'error': 'File validation failed',
                'transcript': '',
                'duration': 0.0
            }

        try:
            logger.info(f"Transcribing: {file_path}")
            
            # Get file duration
            duration = self.get_audio_duration(file_path)
            
            # Load model if not loaded
            self.load_model()
            
            # Transcribe with Whisper
            result = self.model.transcribe(file_path)
            
            # Extract transcript
            transcript = result.get('text', '').strip()
            
            # Generate summary and action items (simplified for now)
            summary = self.generate_summary(transcript)
            action_items = self.extract_action_items(transcript)
            
            return {
                'filename': Path(file_path).name,
                'success': True,
                'transcript': transcript,
                'summary': summary,
                'action_items': action_items,
                'duration': duration,
                'language': result.get('language', 'unknown'),
                'segments': len(result.get('segments', []))
            }
            
        except Exception as e:
            logger.error(f"Error transcribing {file_path}: {e}")
            return {
                'filename': Path(file_path).name,
                'success': False,
                'error': str(e),
                'transcript': '',
                'duration': 0.0
            }

    def generate_summary(self, transcript: str) -> str:
        """Generate a summary of the transcript"""
        if not transcript:
            return "No transcript available"
        
        # Simple summary generation (in a real implementation, you'd use a more sophisticated approach)
        sentences = transcript.split('.')
        if len(sentences) <= 3:
            return transcript
        
        # Take first few sentences as summary
        summary_sentences = sentences[:3]
        return '. '.join(summary_sentences) + '.'

    def extract_action_items(self, transcript: str) -> str:
        """Extract action items from the transcript"""
        if not transcript:
            return "No action items found"
        
        # Simple action item extraction (in a real implementation, you'd use NLP)
        action_keywords = ['action', 'todo', 'task', 'follow up', 'next steps', 'deadline']
        sentences = transcript.split('.')
        action_sentences = []
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(keyword in sentence_lower for keyword in action_keywords):
                action_sentences.append(sentence.strip())
        
        if action_sentences:
            return '. '.join(action_sentences) + '.'
        else:
            return "No action items identified"

    def transcribe_batch(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """Transcribe multiple files"""
        results = []
        for file_path in file_paths:
            result = self.transcribe_file(file_path)
            results.append(result)
            print(json.dumps(result))  # Output for Motia
        return results

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print("Usage: python transcribe_whisper.py <file1> [file2] [file3] ...")
        print("Or: python transcribe_whisper.py --help")
        sys.exit(1)
    
    # Check for help flag
    if sys.argv[1] in ['--help', '-h']:
        print("Whisper Transcription Script")
        print("===========================")
        print("Transcribes audio files using OpenAI Whisper model")
        print("")
        print("Usage:")
        print("  python transcribe_whisper.py <file1> [file2] [file3] ...")
        print("")
        print("Supported formats:")
        print("  - MP3, WAV, M4A, FLAC, OGG, MP4 (Teams recordings)")
        print("")
        print("Output:")
        print("  JSON format with transcript, summary, and action items")
        sys.exit(0)
    
    # Get file paths from command line arguments
    file_paths = sys.argv[1:]
    
    # Initialize transcriber
    transcriber = WhisperTranscriber(model_name="base")
    
    # Process files
    results = transcriber.transcribe_batch(file_paths)
    
    # Print summary
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    print(f"\nProcessing complete: {successful}/{total} files processed successfully")

if __name__ == "__main__":
    main() 