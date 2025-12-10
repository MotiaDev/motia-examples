# Usage Guide: Motia Meetings Transcription Example

This guide covers how to use the Motia Meetings Transcription Example for processing audio files and generating meeting summaries.

## Quick Start

### 1. Launch the Application

```bash
# Start the Streamlit UI
streamlit run ui/meetings_ui.py
```

### 2. Upload Audio Files

1. Open your browser to `http://localhost:8501`
2. Drag and drop audio files or click "Browse files"
3. Supported formats: MP3, WAV, M4A, FLAC, OGG
4. Maximum file size: 100MB per file

### 3. Process Files

1. Click "🎯 Start Transcription"
2. Wait for processing to complete
3. View results in the interface
4. Download CSV and HTML reports

## Detailed Usage

### Using the Streamlit UI

#### File Upload
- **Single File**: Click "Browse files" and select one audio file
- **Multiple Files**: Hold Ctrl/Cmd and select multiple files
- **Drag & Drop**: Drag files directly onto the upload area
- **Batch Processing**: Upload multiple files for batch processing

#### Processing Options
- **Model Size**: Choose Whisper model (tiny, base, small)
- **Batch Processing**: Enable/disable batch processing
- **Generate Report**: Create HTML summary report

#### Results Viewing
- **Summary Metrics**: View processing statistics
- **Data Table**: Browse extracted data
- **Individual Details**: Click on specific meetings
- **Download Options**: Export CSV and HTML reports

### Using Command Line

#### Direct Motia Flow Execution

```bash
# Run the complete pipeline
motia run flows/flow_meeting_summarizer.yml

# Run with specific input directory
motia run flows/flow_meeting_summarizer.yml --input-dir ./my_audio_files

# Run with custom output directory
motia run flows/flow_meeting_summarizer.yml --output-dir ./my_results
```

#### Individual Script Usage

```bash
# Transcribe audio files directly
python scripts/transcribe_whisper.py audio1.mp3 audio2.wav

# Generate report from CSV
python scripts/generate_report.py results.csv report.html

# Process OCR documents
python scripts/run_mistral_ocr.py document1.pdf document2.jpg
```

### Using the OCR Example

#### Launch OCR UI

```bash
streamlit run ui/ocr_ui.py
```

#### Process Invoice Documents

1. Upload PDF, JPG, PNG files
2. Click "Start OCR Processing"
3. View extracted invoice data
4. Download structured results

## Input File Requirements

### Audio Files

#### Supported Formats
- **MP3**: Most common, good compression
- **WAV**: Uncompressed, high quality
- **M4A**: Apple format, good compression
- **FLAC**: Lossless compression
- **OGG**: Open source format

#### File Requirements
- **Size**: < 100MB per file
- **Duration**: < 4 hours per file
- **Quality**: Clear audio, minimal background noise
- **Language**: English (other languages supported but may be less accurate)

#### Audio Quality Tips
- Use high-quality recordings
- Minimize background noise
- Ensure clear speaker audio
- Avoid echo and reverberation
- Use consistent volume levels

### Document Files (OCR)

#### Supported Formats
- **PDF**: Multi-page documents
- **JPG/JPEG**: Image files
- **PNG**: Image files with transparency
- **TIFF**: High-resolution images
- **BMP**: Basic image format

#### Document Requirements
- **Resolution**: > 150 DPI for good OCR
- **Contrast**: High contrast text
- **Orientation**: Correctly oriented
- **Language**: English text (primary)

## Output Formats

### CSV Output

The pipeline generates a CSV file with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `filename` | Original file name | `meeting_2024_01_15.mp3` |
| `summary` | Meeting summary | `Discussed Q4 results and planning for Q1...` |
| `action_items` | Extracted tasks | `- Schedule follow-up meeting\n- Review budget proposal` |
| `duration` | Audio duration (minutes) | `45.2` |
| `transcript` | Full transcript text | `Hello everyone, welcome to our meeting...` |

### HTML Report

The HTML report includes:
- **Summary Statistics**: Processing metrics
- **Meeting Details**: Individual meeting information
- **Action Items**: Highlighted tasks and follow-ups
- **Transcript Previews**: First 500 characters of each transcript
- **Downloadable Content**: Links to full reports

### JSON Output (API)

For programmatic access, results are also available in JSON format:

```json
{
  "meetings": [
    {
      "filename": "meeting_2024_01_15.mp3",
      "summary": "Q4 results discussion",
      "action_items": ["Schedule follow-up", "Review budget"],
      "duration": 45.2,
      "transcript": "Full transcript text...",
      "language": "en",
      "segments": 15
    }
  ],
  "metadata": {
    "processed_files": 1,
    "total_duration": 45.2,
    "processing_time": 120.5
  }
}
```

## Configuration Options

### Environment Variables

Set these in your `.env` file:

```env
# Whisper model configuration
WHISPER_MODEL=base
WHISPER_LANGUAGE=en
WHISPER_TASK=transcribe

# Processing options
BATCH_SIZE=5
MAX_FILE_SIZE_MB=100
PROCESSING_TIMEOUT=300

# Output options
GENERATE_HTML_REPORT=true
INCLUDE_TRANSCRIPT=true
COMPRESS_OUTPUT=false

# Performance options
USE_GPU=false
NUM_THREADS=4
MEMORY_LIMIT_GB=8
```

### Model Selection

#### Whisper Models

| Model | Size | RAM Usage | Speed | Accuracy | Use Case |
|-------|------|-----------|-------|----------|----------|
| `tiny` | 39MB | ~1GB | Fast | Good | Quick processing, low RAM |
| `base` | 74MB | ~2GB | Medium | Better | Balanced performance |
| `small` | 244MB | ~4GB | Slow | Best | High accuracy needed |
| `medium` | 769MB | ~8GB | Very Slow | Excellent | Professional use |
| `large` | 1550MB | ~16GB | Very Slow | Best | Maximum accuracy |

#### Recommendation for 16GB RAM
- **Default**: Use `base` model
- **Low RAM**: Use `tiny` model
- **High Accuracy**: Use `small` model (if RAM allows)

### Custom Prompts

#### Meeting Summarization

Modify the summarization prompt in `flows/flow_meeting_summarizer.yml`:

```yaml
instructions: >
  Summarize the meeting transcript and extract key points.
  Focus on:
  - Main topics discussed
  - Decisions made
  - Action items and assignments
  - Important deadlines
  - Follow-up tasks
  - Key metrics or numbers mentioned
  - Attendee participation highlights
```

#### Invoice Extraction

Modify the extraction schema in `flows/flow_invoice_ocr.yml`:

```yaml
schema:
  - field: date
    type: date
    description: "Invoice date in YYYY-MM-DD format"
  - field: total_amount
    type: money
    description: "Total invoice amount in dollars"
  - field: vendor_name
    type: string
    description: "Company or vendor name"
  - field: invoice_number
    type: string
    description: "Invoice number or ID"
  - field: currency
    type: string
    description: "Currency code (USD, EUR, etc.)"
  - field: line_items
    type: array
    description: "List of individual line items"
```

## Advanced Usage

### Batch Processing

#### Large File Sets

For processing many files:

1. **Organize files**: Place all audio files in `inputs/audio_inputs/`
2. **Run batch**: Execute the pipeline once
3. **Monitor progress**: Check the UI for real-time updates
4. **Review results**: Examine the combined CSV output

#### Scheduled Processing

Set up automated processing:

```bash
# Windows Task Scheduler
# Create a batch file (process_meetings.bat):
@echo off
cd /d C:\path\to\MotiaMeetingTranscriptionExample
call .venv\Scripts\activate
motia run flows/flow_meeting_summarizer.yml
```

### Custom Processing

#### Modify Transcription Script

Edit `scripts/transcribe_whisper.py`:

```python
# Change model size
transcriber = WhisperTranscriber(model_name="small")

# Add custom processing
def custom_post_process(text):
    # Add your custom text processing
    return text.upper()

# Modify the transcribe_file method
transcript = custom_post_process(result["text"])
```

#### Custom Report Generation

Edit `scripts/generate_report.py`:

```python
# Add custom metrics
def calculate_custom_metrics(df):
    return {
        "total_words": df['transcript'].str.split().str.len().sum(),
        "avg_meeting_length": df['duration'].mean(),
        "action_item_count": df['action_items'].str.count('\n').sum()
    }
```

### Integration with Other Tools

#### Export to Calendar

```python
# Add to generate_report.py
def export_to_calendar(meeting_data):
    # Generate calendar events for action items
    for item in meeting_data['action_items']:
        # Create calendar event
        pass
```

#### Export to Project Management

```python
# Add to generate_report.py
def export_to_jira(meeting_data):
    # Create Jira tickets for action items
    for item in meeting_data['action_items']:
        # Create Jira issue
        pass
```

## Performance Optimization

### Memory Management

#### For Large Files
- Process files individually
- Use `tiny` Whisper model
- Close other applications
- Monitor memory usage

#### For Batch Processing
- Limit batch size to 5-10 files
- Use `base` model for balance
- Process during off-peak hours
- Use SSD storage for faster I/O

### Speed Optimization

#### GPU Acceleration
```bash
# Install CUDA-enabled PyTorch
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118

# Use faster-whisper
pip install faster-whisper
```

#### Parallel Processing
```python
# Modify scripts for parallel processing
from concurrent.futures import ThreadPoolExecutor

def process_parallel(file_paths):
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(process_file, file_paths))
    return results
```

## Troubleshooting

### Common Issues

#### Processing Fails
1. Check file format and size
2. Verify audio quality
3. Ensure sufficient disk space
4. Check memory usage

#### Poor Transcription Quality
1. Use higher quality audio
2. Reduce background noise
3. Use larger Whisper model
4. Check audio file integrity

#### Slow Processing
1. Use smaller Whisper model
2. Enable GPU acceleration
3. Process fewer files at once
4. Close other applications

### Getting Help

1. Check the [troubleshooting guide](troubleshooting.md)
2. Review error logs in the UI
3. Test with sample files
4. Open an issue with details

## Best Practices

### File Organization
- Use descriptive file names
- Organize by date or project
- Keep original files backed up
- Use consistent naming conventions

### Quality Assurance
- Review transcriptions manually
- Verify extracted action items
- Check summary accuracy
- Validate data completeness

### Security
- Process sensitive files locally
- Don't upload to cloud services
- Secure output files appropriately
- Follow data retention policies

### Maintenance
- Update dependencies regularly
- Monitor disk space usage
- Clean up temporary files
- Backup configuration files 