# Motia Image Resizer

A high-performance image processing pipeline built with the Motia framework that automatically resizes uploaded images into multiple formats for different use cases (mobile, desktop, and low-quality variants).

## Features

- **Cloud Storage**: Uses AWS S3 for scalable file storage with adapter pattern for easy switching
- **Parallel Processing**: Simultaneous resize operations for optimal performance
- **Multiple Output Formats**: Desktop (1920px), Mobile (720px), and Low-quality (480px) variants
- **Format Support**: JPEG, PNG, and WebP images
- **Event-Driven Architecture**: Uses Motia's event system for scalable processing
- **Comprehensive Logging**: Detailed tracing and error handling
- **File Validation**: Format and size validation with clear error messages
- **Extensible Storage**: Adapter pattern allows easy integration with other storage providers

## Architecture

The application uses an event-driven architecture with the following components:

```
Upload Image → Save to S3 → Image Saved Event → Parallel Resize Operations → Completion Tracking
     ↓              ↓              ↓                        ↓                        ↓
  Validation    S3 Storage    Event Emission         Desktop Resize           Status Updates
  Base64 Decode              (with S3 URLs)         Mobile Resize            (S3 URLs)
                                                  Low-Quality Resize
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Motia CLI
- AWS S3 bucket (or compatible storage service)
- AWS credentials configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd motia-image-resizer

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your AWS S3 credentials

# Set up the project
npm run postinstall

# Start development server
npm run dev
```

### Basic Usage

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Upload an image**:
   ```bash
   curl -X POST http://localhost:3000/upload-image \
     -H "Content-Type: application/json" \
     -d '{
       "filename": "test-image.jpg",
       "data": "base64-encoded-image-data"
     }'
   ```

3. **Check your S3 bucket**:
   - Images are stored in S3 with organized prefixes:
   - `originals/` - Original uploaded images
   - `desktop/` - Desktop-sized images (1920px width)
   - `mobile/` - Mobile-sized images (720px width)
   - `lowquality/` - Compressed images (480px width, 60% quality)

## API Reference

### Upload Image

**Endpoint**: `POST /upload-image`

**Request Body**:
```json
{
  "filename": "image.jpg",
  "data": "base64-encoded-image-data"
}
```

**Response**:
```json
{
  "message": "Image uploaded successfully and processing started",
  "traceId": "uuid-trace-id",
  "imageMetadata": {
    "originalFilename": "image.jpg",
    "uniqueFilename": "image_1234567890.jpg",
    "format": "jpeg",
    "originalStorageKey": "originals/image_1234567890.jpg",
    "originalUrl": "https://your-bucket.s3.us-east-1.amazonaws.com/originals/image_1234567890.jpg",
    "traceId": "uuid-trace-id",
    "uploadedAt": "2025-01-26T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Invalid file format, missing data, or validation errors
- `500`: Server error during processing

### Supported Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)

### File Size Limits

- **Maximum**: 50MB per image
- **JSON Body Limit**: ~100KB (due to Express body parser limits)

## Testing

### Convert Images to Base64

Use the provided utility script:

```bash
# Convert an image to base64 for API testing
node scripts/convert-to-base64.js path/to/your/image.jpg

# This generates a JSON file ready for API testing
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Integration Testing

```bash
# Test the complete workflow
npm test -- tests/integration/workflow.test.ts
```

## Project Structure

```
motia-image-resizer/
├── steps/                          # Motia step definitions
│   ├── upload-image.step.ts        # Image upload and validation
│   ├── desktop-resize.step.ts      # Desktop resize (1920px)
│   ├── mobile-resize.step.ts       # Mobile resize (720px)
│   ├── lowquality-resize.step.ts   # Low-quality resize (480px)
│   └── completion-tracker.step.ts  # Processing completion tracking
├── shared/                         # Shared utilities and interfaces
│   ├── interfaces.ts               # TypeScript interfaces
│   └── utils.ts                    # Utility functions
├── tests/                          # Test files
│   ├── integration/                # Integration tests
│   └── utils/                      # Test utilities
├── scripts/                        # Utility scripts
│   └── convert-to-base64.js        # Base64 conversion utility
├── output/                         # Generated images (gitignored)
│   ├── original/                   # Original uploaded images
│   ├── desktop/                    # Desktop-sized images
│   ├── mobile/                     # Mobile-sized images
│   └── lowquality/                 # Low-quality compressed images
└── docs/                           # Documentation
    ├── UPLOAD_TESTING.md           # API testing guide
    └── github-issue-draft.md       # Feature request template
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

### Resize Settings

The resize configurations are defined in `shared/storage-utils.ts`:

```typescript
const RESIZE_CONFIGS = {
  desktop: { width: 1920, quality: 90 },
  mobile: { width: 720, quality: 85 },
  lowquality: { width: 480, quality: 60 }
}
```

### Storage Structure

Images are organized in S3 with the following prefixes:
- `originals/` - Original uploaded images
- `desktop/` - Desktop-optimized images (1920px)
- `mobile/` - Mobile-optimized images (720px)
- `lowquality/` - Compressed low-quality images (480px)

### Storage Adapters

The application uses the adapter pattern for storage. Current adapters:

- **S3StorageAdapter** (default) - AWS S3 compatible storage
- **TODO**: SupabaseStorageAdapter, CloudflareR2Adapter, LocalFileSystemAdapter

To implement a new storage adapter, implement the `StorageAdapter` interface in `shared/storage.ts`.

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build the project
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run clean        # Clean build artifacts
```

### Adding New Resize Variants

1. Create a new step file in `steps/`
2. Define the resize configuration
3. Subscribe to the `image-saved` event
4. Emit completion events for tracking
5. Update the completion tracker

### Debugging

Enable verbose logging:
```bash
npm run dev:debug
```

## Known Limitations

### File Upload Method

Currently, only base64 JSON uploads are supported due to Motia framework limitations:

- **Multipart/form-data**: Not supported (framework limitation)
- **File size**: Limited by JSON body parser (~100KB)
- **Workaround**: Use base64 encoding for smaller images

### Performance Considerations

- **Parallel Processing**: All resize operations run simultaneously
- **Memory Usage**: Large images may consume significant memory during processing
- **Disk Space**: Each image generates 4 files (original + 3 variants)

## Troubleshooting

### Common Issues

1. **"PayloadTooLargeError"**: Image too large for JSON body parser
   - Solution: Use smaller images or compress before upload

2. **"Invalid image format"**: Unsupported file type
   - Solution: Use JPEG, PNG, or WebP formats only

3. **"Sharp processing failed"**: Image corruption or invalid data
   - Solution: Verify image file integrity

### Debug Information

Check server logs for detailed processing information:
- Upload validation steps
- Resize operation progress
- Error details with context
- Processing time metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the test files for usage examples
- Submit issues on GitHub
- Refer to Motia framework documentation