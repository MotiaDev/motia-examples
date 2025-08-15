# Setup Guide: Motia Meetings Transcription Example

This guide will walk you through setting up the Motia Meetings Transcription Example on a Windows machine with 16GB RAM.

## Prerequisites

### System Requirements
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 16GB (8GB minimum)
- **Storage**: 2GB free space
- **Python**: 3.10 or higher
- **Internet**: Required for initial model download

### Software Requirements
- Python 3.10+
- Git
- FFmpeg (for audio processing)
- Tesseract OCR (for invoice processing)

## Step-by-Step Installation

### 1. Install Python

1. Download Python 3.10+ from [python.org](https://www.python.org/downloads/)
2. During installation, check "Add Python to PATH"
3. Verify installation:
   ```bash
   python --version
   pip --version
   ```

### 2. Install FFmpeg

1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your system PATH
4. Verify installation:
   ```bash
   ffmpeg -version
   ```

### 3. Install Tesseract OCR (for invoice processing)

1. Download Tesseract installer from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
2. Run installer and note the installation path
3. Add Tesseract to PATH (usually `C:\Program Files\Tesseract-OCR`)
4. Verify installation:
   ```bash
   tesseract --version
   ```

### 4. Clone the Repository

```bash
git clone https://github.com/your-username/MotiaMeetingTranscriptionExample.git
cd MotiaMeetingTranscriptionExample
```

### 5. Create Virtual Environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 6. Install Dependencies

```bash
pip install -r requirements.txt
```

### 7. Install Motia CLI

```bash
# Install Motia CLI (adjust command based on official installation method)
pip install motia-cli
# or
# Download from official Motia releases
```

### 8. Download Whisper Models

```bash
# Download the base model (recommended for 16GB RAM)
python -c "import whisper; whisper.load_model('base')"

# For lower RAM usage, use tiny model
python -c "import whisper; whisper.load_model('tiny')"
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Whisper model size (tiny, base, small, medium, large)
WHISPER_MODEL=base

# Tesseract path (if not in PATH)
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe

# Processing options
BATCH_SIZE=5
MAX_FILE_SIZE_MB=100
```

### Directory Structure

Ensure the following directories exist:
```
MotiaMeetingTranscriptionExample/
├── inputs/
│   └── audio_inputs/     # Audio files for transcription
├── outputs/              # Generated results
├── temp/                 # Temporary files
└── models/               # Downloaded models (optional)
```

## Testing the Installation

### 1. Test Whisper

```bash
python scripts/transcribe_whisper.py --test
```

### 2. Test OCR

```bash
python scripts/run_mistral_ocr.py --test
```

### 3. Test Motia Flow

```bash
motia run flows/flow_meeting_summarizer.yml --dry-run
```

### 4. Test Streamlit UI

```bash
streamlit run ui/meetings_ui.py
```

## Troubleshooting

### Common Issues

#### "Out of memory" error
- Use Whisper `tiny` model instead of `base`
- Close other applications
- Process files one at a time

#### "FFmpeg not found" error
- Ensure FFmpeg is in PATH
- Restart terminal after adding to PATH
- Verify with `ffmpeg -version`

#### "Tesseract not found" error
- Ensure Tesseract is installed and in PATH
- Check installation path in system variables
- Restart terminal after installation

#### "Motia CLI not found" error
- Install Motia CLI properly
- Check if it's in PATH
- Verify installation with `motia --version`

#### Audio file format issues
- Ensure files are MP3, WAV, or M4A
- Check file isn't corrupted
- Try converting with FFmpeg:
  ```bash
  ffmpeg -i input.m4a output.mp3
  ```

#### Python package conflicts
- Use virtual environment
- Update pip: `python -m pip install --upgrade pip`
- Reinstall packages: `pip install -r requirements.txt --force-reinstall`

### Performance Optimization

#### For 16GB RAM systems:
- Use Whisper `base` model (not `medium` or `large`)
- Process files in batches of 3-5
- Close other applications during processing
- Monitor memory usage with Task Manager

#### For faster processing:
- Use GPU acceleration (if available)
- Install CUDA-enabled PyTorch
- Use `faster-whisper` instead of `openai-whisper`

### Getting Help

1. Check the [troubleshooting guide](troubleshooting.md)
2. Review [usage instructions](usage.md)
3. Open an issue with:
   - Error message
   - System specifications
   - Steps to reproduce
   - Log files

## Next Steps

After successful setup:

1. **Try the UI**: `streamlit run ui/meetings_ui.py`
2. **Process sample files**: Add audio files to `inputs/audio_inputs/`
3. **Explore the code**: Review scripts and flows
4. **Customize**: Modify prompts and processing logic
5. **Contribute**: Submit improvements and bug fixes

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/MotiaMeetingTranscriptionExample/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/MotiaMeetingTranscriptionExample/discussions)
- **Motia Community**: [Motia Discord/Forum](https://motia.dev/community) 