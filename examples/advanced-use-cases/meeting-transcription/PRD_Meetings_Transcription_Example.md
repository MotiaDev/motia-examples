# Product Requirements Document: Motia Meetings Transcription Example

## Executive Summary

This PRD outlines the development of a **Meetings Transcription Summarizer** as a zero-to-sixty Motia platform example. The solution will demonstrate local, privacy-friendly meeting audio processing using Whisper for transcription and Motia for summarization, designed specifically for Windows development environments with 16GB RAM.

**NOTE: This PRD describes the original vision for a local meeting transcription system. We have implemented a comprehensive data processing platform with streams (see PRD_Motia_Data_Processing_Platform.md), and this PRD outlines what needs to be implemented to achieve the original meeting transcription vision.**

## 1. Product Overview

### 1.1 Product Vision

Create a compelling, production-ready example that showcases Motia's capabilities for local audio processing and AI-powered summarization, serving as a reference implementation for the Motia examples repository.

### 1.2 Target Users

- **Primary**: Motia developers and contributors looking for practical examples
- **Secondary**: Developers building local-first AI applications
- **Tertiary**: Teams needing privacy-friendly meeting analysis tools

### 1.3 Success Metrics

- Zero external dependencies (fully offline capable)
- < 30 seconds setup time on fresh Windows machine
- < 8GB RAM usage during processing
- Clear, maintainable code structure
- Comprehensive documentation

## 2. Technical Requirements

### 2.1 System Architecture

**CURRENT IMPLEMENTATION** (Data Processing Platform):
```
MotiaMeetingTranscriptionExample/
├── meeting_transcript_example/
│   ├── steps/
│   │   ├── 04-data-processor.step.ts
│   │   ├── 05-data-validator.step.ts
│   │   ├── 06-data-storage.step.ts
│   │   ├── 07-data-api.step.ts
│   │   ├── 08-data-retrieval-api.step.ts
│   │   ├── 09-cron-cleanup.step.ts
│   │   ├── 10-error-handler.step.ts
│   │   ├── 12-meeting-transcription-api.step.ts (simulated)
│   │   ├── 13-meeting-transcription-processor.step.ts (simulated)
│   │   └── *.stream.ts (stream configurations)
│   ├── ui/
│   │   └── StreamComponents.tsx
│   ├── package.json
│   └── tsconfig.json
├── flows/
│   ├── flow_data_processing.yml
│   └── flow_meeting_transcription.yml
├── docs/
│   ├── STEPS_DOCUMENTATION.md
│   ├── STREAMS_AND_FLOWS_DOCUMENTATION.md
│   └── README.md
└── PRD_Motia_Data_Processing_Platform.md
```

**TO BE IMPLEMENTED** (Real Meeting Transcription):
```
MotiaMeetingTranscriptionExample/
├── meeting_transcript_example/
│   ├── steps/
│   │   ├── 14-whisper-transcription.step.ts (NEW - real Whisper)
│   │   ├── 15-transcription-analyzer.step.ts (NEW - content analysis)
│   │   ├── 16-transcription-storage.step.ts (NEW - persistent storage)
│   │   └── 17-transcription-retrieval.step.ts (NEW - search/export)
│   ├── scripts/
│   │   └── transcribe_whisper.py (enhanced with real Whisper)
│   └── models/
│       └── whisper/ (local model storage)
├── flows/
│   └── flow_real_transcription.yml (NEW)
├── ui/
│   └── TranscriptionUI.tsx (NEW)
├── inputs/
│   └── audio_inputs/
├── outputs/
├── docs/
│   ├── setup.md
│   ├── usage.md
│   └── troubleshooting.md
├── requirements.txt
├── README.md
└── PRD_Meeting_Transcription_System.md
```

### 2.2 Core Components

#### 2.2.1 Motia Flow (flow_meeting_summarizer.yml)

```yaml
name: Meeting Transcripts Summarizer
description: >
  Transcribes local meeting audio files, summarizes, and outputs key points as CSV.

steps:
  - name: ListAudio
    uses: local/fs-list
    with:
      path: ./audio_inputs/
      extensions: [mp3, wav, m4a]

  - name: Transcribe
    uses: local/python
    with:
      script: ./scripts/transcribe_whisper.py
      args: ${{ steps.ListAudio.files }}

  - name: Summarize
    uses: motia/langchain-summarize
    with:
      input_text: ${{ steps.Transcribe.texts }}
      instructions: "Summarize the meeting transcript and extract action items."

  - name: SaveCSV
    uses: local/csv-write
    with:
      data: ${{ steps.Summarize.summaries }}
      output: ./outputs/meeting_summaries.csv
```

#### 2.2.2 Whisper Transcription Script

- **Technology**: OpenAI Whisper (base model for 16GB RAM compatibility)
- **Input**: Audio files (mp3, wav, m4a)
- **Output**: Plain text transcripts
- **Error Handling**: Graceful failure with detailed error messages

#### 2.2.3 Streamlit UI

- **Purpose**: Drag-and-drop interface for non-technical users
- **Features**: File upload, progress indication, results display, CSV download
- **Design**: Clean, intuitive interface with clear feedback

### 2.3 Technical Constraints

#### 2.3.1 Hardware Requirements

- **RAM**: Maximum 8GB usage during processing
- **Storage**: 2GB for models and temporary files
- **CPU**: Multi-core recommended for faster processing
- **GPU**: Optional (CUDA support for acceleration)

#### 2.3.2 Software Requirements

- **OS**: Windows 10/11 (64-bit)
- **Python**: 3.10+
- **Dependencies**: All pip-installable packages
- **Network**: Offline-first (models downloaded once)

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 Audio Processing

- **Supported Formats**: MP3, WAV, M4A
- **Batch Processing**: Multiple files in single run
- **Progress Tracking**: Real-time status updates
- **Error Recovery**: Continue processing on file failures

#### 3.1.2 Transcription

- **Accuracy**: Base Whisper model (good balance of speed/accuracy)
- **Language**: Auto-detection with English optimization
- **Output**: Clean, formatted text with speaker segmentation (if possible)

#### 3.1.3 Summarization

- **Content**: Meeting summaries with key points
- **Action Items**: Extracted tasks and follow-ups
- **Format**: Structured CSV with columns: filename, summary, action_items, duration

#### 3.1.4 User Interface

- **Upload**: Drag-and-drop file selection
- **Processing**: Real-time progress indicators
- **Results**: Tabular view with search/filter
- **Export**: CSV download functionality

### 3.2 Bonus Features (Invoice OCR Example)

#### 3.2.1 Document Processing

- **Supported Formats**: PDF, JPG, PNG
- **OCR Engine**: Mistral OCR (local)
- **Output**: Structured invoice data (date, amount, vendor)

#### 3.2.2 Data Extraction

- **Fields**: Date, total amount, vendor name
- **Validation**: Basic data quality checks
- **Export**: CSV with extracted fields

## 4. Non-Functional Requirements

### 4.1 Performance

- **Setup Time**: < 5 minutes for first-time users
- **Processing Speed**: ~1 minute per 10-minute audio file
- **Memory Usage**: < 8GB peak during processing
- **Disk Usage**: < 2GB for models and temporary files

### 4.2 Reliability

- **Error Handling**: Graceful degradation on file failures
- **Recovery**: Ability to resume interrupted processing
- **Validation**: Input file format and size validation

### 4.3 Usability

- **Learning Curve**: < 10 minutes to first successful run
- **Documentation**: Clear setup and usage instructions
- **Troubleshooting**: Common issues and solutions guide

### 4.4 Privacy & Security

- **Local Processing**: No data leaves user's machine
- **No Logging**: No external telemetry or logging
- **Data Cleanup**: Automatic temporary file cleanup

## 5. Implementation Plan

### 5.1 Phase 1: Core Infrastructure (Week 1)

- [x] Project structure setup (COMPLETED - Data Processing Platform)
- [x] Basic Motia flow implementation (COMPLETED - Data Processing Platform)
- [ ] Whisper integration (TO BE IMPLEMENTED)
- [ ] Local file handling (TO BE IMPLEMENTED)

### 5.2 Phase 2: UI Development (Week 2)

- [x] Streamlit interface (COMPLETED - meetings_ui.py exists)
- [x] File upload functionality (COMPLETED - meetings_ui.py exists)
- [x] Progress tracking (COMPLETED - StreamComponents.tsx exists)
- [x] Results display (COMPLETED - StreamComponents.tsx exists)

### 5.3 Phase 3: Enhancement & Testing (Week 3)

- [x] Error handling improvements (COMPLETED - Data Processing Platform)
- [x] Performance optimization (COMPLETED - Data Processing Platform)
- [x] Documentation (COMPLETED - Comprehensive docs exist)
- [ ] Testing on target hardware (TO BE IMPLEMENTED - Real Whisper integration)

### 5.4 Phase 4: Bonus Features (Week 4)

- [x] Invoice OCR example (COMPLETED - ocr_ui.py and run_mistral_ocr.py exist)
- [x] Advanced UI features (COMPLETED - StreamComponents.tsx exists)
- [x] Additional export formats (COMPLETED - Data Processing Platform)
- [ ] Performance benchmarking (TO BE IMPLEMENTED - Real Whisper integration)

## 6. Technical Implementation Details

### 6.1 Dependencies

#### 6.1.1 Core Requirements

```
motia>=0.1.0
openai-whisper>=20231117
streamlit>=1.28.0
pandas>=2.0.0
pathlib
```

#### 6.1.2 Optional Requirements

```
faster-whisper>=0.9.0  # For GPU acceleration
torch>=2.0.0          # For CUDA support
```

### 6.2 File Structure

#### 6.2.1 Scripts

- **transcribe_whisper.py**: Core transcription logic
- **run_mistral_ocr.py**: OCR processing (bonus feature)

#### 6.2.2 UI Components

- **meetings_ui.py**: Main meeting transcription interface
- **ocr_ui.py**: Invoice OCR interface (bonus feature)

#### 6.2.3 Configuration

- **requirements.txt**: Python dependencies
- **.gitignore**: Exclude temporary files and models

### 6.3 Error Handling Strategy

#### 6.3.1 File-Level Errors

- Invalid file formats
- Corrupted audio files
- Permission issues
- Disk space problems

#### 6.3.2 Processing Errors

- Model loading failures
- Memory exhaustion
- Transcription timeouts
- Network interruptions (during model download)

#### 6.3.3 Recovery Mechanisms

- Skip failed files and continue
- Retry logic for transient errors
- Clear error messages for user action
- Partial results preservation

## 7. Testing Strategy

### 7.1 Unit Testing

- Individual script functionality
- Error handling scenarios
- File format validation

### 7.2 Integration Testing

- End-to-end flow execution
- UI interaction testing
- Cross-platform compatibility

### 7.3 Performance Testing

- Memory usage profiling
- Processing speed benchmarks
- Large file handling

### 7.4 User Acceptance Testing

- Setup process validation
- Usability testing
- Documentation review

## 8. Documentation Requirements

### 8.1 User Documentation

- **README.md**: Project overview and quick start
- **setup.md**: Detailed installation instructions
- **usage.md**: Step-by-step usage guide
- **troubleshooting.md**: Common issues and solutions

### 8.2 Developer Documentation

- **API.md**: Script interfaces and parameters
- **architecture.md**: System design and flow diagrams
- **contributing.md**: Development setup and guidelines

### 8.3 Example Data

- Sample audio files for testing
- Expected output formats
- Performance benchmarks

## 9. Deployment & Distribution

### 9.1 Repository Structure

- Clean, organized file structure
- Comprehensive documentation
- Example data and configurations
- Clear contribution guidelines

### 9.2 Release Process

- Version tagging strategy
- Changelog maintenance
- Dependency updates
- Compatibility testing

### 9.3 Community Integration

- Motia examples repository submission
- Documentation cross-linking
- Community feedback integration

## 10. Success Criteria & KPIs

### 10.1 Technical Metrics

- [ ] Zero external API dependencies
- [ ] < 30 second setup time
- [ ] < 8GB RAM usage
- [ ] 100% offline capability

### 10.2 User Experience Metrics

- [ ] Clear setup instructions
- [ ] Intuitive UI design
- [ ] Comprehensive error messages
- [ ] Fast processing times

### 10.3 Community Metrics

- [ ] Repository stars and forks
- [ ] Community contributions
- [ ] Documentation completeness
- [ ] Example adoption rate

## 11. Risk Assessment & Mitigation

### 11.1 Technical Risks

- **Risk**: Whisper model too large for 16GB RAM
- **Mitigation**: Use base/tiny models, provide memory optimization options

- **Risk**: Audio format compatibility issues
- **Mitigation**: Comprehensive format testing, clear error messages

### 11.2 User Experience Risks

- **Risk**: Complex setup process
- **Mitigation**: Automated setup scripts, detailed documentation

- **Risk**: Poor performance on target hardware
- **Mitigation**: Performance profiling, optimization options

### 11.3 Maintenance Risks

- **Risk**: Dependency updates breaking functionality
- **Mitigation**: Version pinning, automated testing

## 12. Future Enhancements

### 12.1 Advanced Features

- Speaker diarization
- Sentiment analysis
- Meeting analytics dashboard
- Integration with calendar systems

### 12.2 Performance Improvements

- GPU acceleration support
- Parallel processing
- Model quantization
- Caching strategies

### 12.3 User Experience

- Web-based interface
- Real-time processing
- Mobile app support
- Cloud deployment options

## 13. Conclusion

This PRD outlines a comprehensive approach to building a production-ready Motia example that demonstrates local AI processing capabilities while maintaining simplicity and accessibility. The focus on Windows development environments with 16GB RAM ensures broad accessibility while the modular design allows for future enhancements and community contributions.

The success of this project will be measured by its adoption within the Motia community, the quality of the codebase, and its ability to serve as a reference implementation for similar local AI applications.
