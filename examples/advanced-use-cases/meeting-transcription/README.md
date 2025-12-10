# Meeting Transcription Example

A comprehensive example demonstrating local, privacy-friendly meeting audio processing using Motia, Whisper, and Streamlit. Perfect for Windows development environments with 16GB RAM.

## 🎯 What This Example Demonstrates

- **Complete Motia Workflow**: End-to-end pipeline from audio input to structured output
- **Local AI Processing**: Privacy-friendly, offline transcription and summarization
- **Multiple Step Types**: API steps, event steps, and custom processing steps
- **Real-world Application**: Meeting transcription with action item extraction
- **Cross-platform UI**: Streamlit interface for easy file upload and results viewing

## 🚀 Quick Start

### Prerequisites

- Windows 10/11 (64-bit)
- Python 3.10+
- 16GB RAM (8GB minimum)
- 2GB free disk space

### Installation

1. **Navigate to the example directory**

   ```bash
   cd examples/meeting-transcription
   ```

2. **Create virtual environment**

   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   npm install
   ```

4. **Download Whisper model** (first time only)

   ```bash
   python -c "import whisper; whisper.load_model('base')"
   ```

### Running the Example

1. **Start the Motia Workbench**

   ```bash
   npm run dev
   ```

2. **Start the Streamlit UI**

   ```bash
   streamlit run ui/meetings_ui.py
   ```

3. **Upload audio files** via the web interface

4. **Run the Motia flow** and download results

## 🔧 Core Components

### Motia Flow (`flows/flow_meeting_summarizer.yml`)

- **ListAudio**: Scans for audio files
- **Transcribe**: Converts audio to text using Whisper
- **Summarize**: Extracts key points and action items
- **SaveCSV**: Outputs structured results
- **GenerateReport**: Creates beautiful HTML reports

### Custom Steps (`steps/`)

- **API Steps**: REST endpoints for triggering workflows
- **Event Steps**: Background processing and state management
- **Custom Processing**: Integration with external AI services

### Whisper Integration (`scripts/transcribe_whisper.py`)

- Local speech-to-text transcription
- Support for MP3, WAV, M4A formats
- Memory-optimized for 16GB RAM systems

## �� Output Format

The pipeline generates structured data including:

- Meeting summaries
- Action items and follow-ups
- Full transcripts
- Processing metrics

## 🎨 Bonus Features

- **Invoice OCR Example**: Document processing with Mistral OCR
- **HTML Reports**: Beautiful, shareable reports
- **Batch Processing**: Handle multiple files efficiently

## �� Privacy & Security

- **100% Local Processing**: No data leaves your machine
- **No External APIs**: All processing happens offline
- **No Logging**: No telemetry or external logging

## �� Learn More

- [Motia Documentation](https://docs.motia.dev)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [Streamlit](https://streamlit.io)

## 📄 License

MIT License - see LICENSE file for details.
