#!/usr/bin/env python3
"""
Test script to verify the Motia Meetings Transcription Example setup
"""

import sys
import os
from pathlib import Path

def test_imports():
    """Test that all required packages can be imported"""
    print("Testing imports...")
    
    try:
        import streamlit
        print("✅ Streamlit imported successfully")
    except ImportError as e:
        print(f"❌ Streamlit import failed: {e}")
        return False
    
    try:
        import pandas
        print("✅ Pandas imported successfully")
    except ImportError as e:
        print(f"❌ Pandas import failed: {e}")
        return False
    
    try:
        import whisper
        print("✅ Whisper imported successfully")
    except ImportError as e:
        print(f"❌ Whisper import failed: {e}")
        return False
    
    try:
        import librosa
        print("✅ Librosa imported successfully")
    except ImportError as e:
        print(f"❌ Librosa import failed: {e}")
        return False
    
    try:
        import pytesseract
        print("✅ Pytesseract imported successfully")
    except ImportError as e:
        print(f"❌ Pytesseract import failed: {e}")
        return False
    
    try:
        import fitz  # PyMuPDF
        print("✅ PyMuPDF imported successfully")
    except ImportError as e:
        print(f"❌ PyMuPDF import failed: {e}")
        return False
    
    return True

def test_whisper():
    """Test Whisper model loading"""
    print("\nTesting Whisper...")
    
    try:
        import whisper
        model = whisper.load_model("tiny")  # Use tiny for quick test
        print("✅ Whisper model loaded successfully")
        return True
    except Exception as e:
        print(f"❌ Whisper model loading failed: {e}")
        return False

def test_tesseract():
    """Test Tesseract OCR"""
    print("\nTesting Tesseract...")
    
    try:
        import pytesseract
        from PIL import Image
        
        # Set Tesseract path
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
        # Create a simple test image with text
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple image with text
        img = Image.new('RGB', (200, 50), color='white')
        draw = ImageDraw.Draw(img)
        draw.text((10, 10), "Test OCR", fill='black')
        
        # Test OCR
        text = pytesseract.image_to_string(img)
        print("✅ Tesseract OCR working")
        return True
    except Exception as e:
        print(f"❌ Tesseract test failed: {e}")
        return False

def test_ffmpeg():
    """Test FFmpeg availability"""
    print("\nTesting FFmpeg...")
    
    try:
        import subprocess
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ FFmpeg is available")
            return True
        else:
            print("❌ FFmpeg returned error")
            return False
    except Exception as e:
        print(f"❌ FFmpeg test failed: {e}")
        return False

def test_scripts():
    """Test that our scripts can be imported"""
    print("\nTesting scripts...")
    
    try:
        # Add scripts directory to path
        sys.path.insert(0, str(Path(__file__).parent / "scripts"))
        
        import transcribe_whisper
        print("✅ transcribe_whisper.py imported successfully")
        
        import run_mistral_ocr
        print("✅ run_mistral_ocr.py imported successfully")
        
        import generate_report
        print("✅ generate_report.py imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Script import failed: {e}")
        return False

def test_directories():
    """Test that required directories exist"""
    print("\nTesting directories...")
    
    required_dirs = [
        "inputs/audio_inputs",
        "outputs",
        "scripts",
        "ui",
        "flows"
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        if Path(dir_path).exists():
            print(f"✅ {dir_path} exists")
        else:
            print(f"❌ {dir_path} missing")
            all_exist = False
    
    return all_exist

def main():
    """Run all tests"""
    print("🧪 Testing Motia Meetings Transcription Example Setup")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_whisper,
        test_tesseract,
        test_ffmpeg,
        test_scripts,
        test_directories
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Setup is complete and ready to use.")
        print("\n🚀 Next steps:")
        print("1. Open http://localhost:8501 in your browser")
        print("2. Upload audio files to test transcription")
        print("3. Or run: streamlit run ui/meetings_ui.py")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 