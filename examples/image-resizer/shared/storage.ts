import { S3Client, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

/**
 * Storage Adapter Interface
 * 
 * TODO: Implement other storage adapters by implementing this interface:
 * - CloudflareR2Adapter  
 * - GoogleCloudStorageAdapter
 */
export interface StorageAdapter {
  /**
   * Save a stream to storage
   * @param stream - Readable stream to save
   * @param key - Storage key/filename
   * @param contentType - Optional content type
   * @returns Promise resolving to the storage key
   */
  saveStream(stream: Readable, key: string, contentType?: string): Promise<string>

  /**
   * Get a readable stream from storage
   * @param key - Storage key/filename
   * @returns Promise resolving to readable stream
   */
  getStream(key: string): Promise<Readable>

  /**
   * Check if a file exists in storage
   * @param key - Storage key to check
   * @returns Promise resolving to boolean indicating existence
   */
  exists(key: string): Promise<boolean>

  /**
   * Get a public URL for a file
   * @param key - Storage key/filename
   * @returns Promise resolving to public URL
   */
  getPublicUrl(key: string): Promise<string>
}

/**
 * AWS S3 Storage Adapter Implementation
 */
export class S3StorageAdapter implements StorageAdapter {
  private s3Client: S3Client
  private bucketName: string
  private region: string

  constructor() {
    // Validate required environment variables
    const requiredEnvVars = ['AWS_S3_BUCKET_NAME', 'AWS_REGION']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    this.bucketName = process.env.AWS_S3_BUCKET_NAME!
    this.region = process.env.AWS_REGION!

    // Initialize S3 client with default credential chain for local + cloud compatibility
    this.s3Client = new S3Client({
      region: this.region,
      // Uses default credential chain: env vars, credentials file, IAM roles, etc.
    })
  }

  async saveStream(stream: Readable, key: string, contentType?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Handle stream errors
      stream.on('error', (error) => {
        reject(new Error(`Stream error: ${error.message}`))
      })

      // Use AWS SDK's Upload class for proper streaming with multipart upload
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: stream,
          ContentType: contentType || this.getContentType(key),
        },
        // Configure multipart upload for better performance with large files
        partSize: 1024 * 1024 * 5, // 5MB parts
        queueSize: 4, // Allow 4 concurrent uploads
      })

      // Handle upload progress (optional)
      upload.on('httpUploadProgress', (progress) => {
        // Optional: Log progress for debugging
        // console.log(`Upload progress: ${progress.loaded}/${progress.total}`)
      })

      // Perform the upload
      upload.done()
        .then(() => {
          resolve(key)
        })
        .catch((error) => {
          reject(new Error(`Failed to save stream to S3: ${error.message}`))
        })
    })
  }

  async getStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)

      if (!response.Body) {
        throw new Error('No file body returned from S3')
      }

      return response.Body as Readable
    } catch (error) {
      throw new Error(`Failed to get stream from S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)
      return true
    } catch (error) {
      return false
    }
  }

  async getPublicUrl(key: string): Promise<string> {
    // Return public S3 URL (assumes bucket is configured for public read)
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
    }
    return contentTypes[ext || ''] || 'application/octet-stream'
  }
}

/**
 * Local File System Storage Adapter Implementation
 */
export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH || 'output'
  }

  async saveStream(stream: Readable, key: string, contentType?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const filePath = `${this.basePath}/${key}`
        
        // Ensure directory exists
        const dir = dirname(filePath)
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }

        const writeStream = createWriteStream(filePath)
        
        // Handle stream errors properly
        stream.on('error', (error) => {
          writeStream.destroy()
          reject(new Error(`Input stream error: ${error.message}`))
        })

        writeStream.on('error', (error) => {
          reject(new Error(`Write stream error: ${error.message}`))
        })

        writeStream.on('finish', () => {
          resolve(key)
        })

        // Pipe the stream
        stream.pipe(writeStream)
        
      } catch (error) {
        reject(new Error(`Failed to save stream to local storage: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  }

  async getStream(key: string): Promise<Readable> {
    try {
      const filePath = `${this.basePath}/${key}`

      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${key}`)
      }

      return createReadStream(filePath)
    } catch (error) {
      throw new Error(`Failed to get stream from local storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = `${this.basePath}/${key}`
    return existsSync(filePath)
  }

  async getPublicUrl(key: string): Promise<string> {
    // For local development, return a local file URL
    // In production, this might be served by a web server
    return `file://${process.cwd()}/${this.basePath}/${key}`
  }
}

/**
 * Storage factory function
 * Returns the configured storage adapter based on environment
 */
export function createStorageAdapter(): StorageAdapter {
  const storageType = process.env.STORAGE_TYPE || 's3'

  switch (storageType.toLowerCase()) {
    case 's3':
      return new S3StorageAdapter()
    case 'local':
      return new LocalStorageAdapter()
    // TODO: Add other storage adapters here
    // case 'r2':
    //   return new CloudflareR2Adapter()
    default:
      throw new Error(`Unsupported storage type: ${storageType}`)
  }
}

/**
 * Singleton storage adapter instance
 */
let storageInstance: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = createStorageAdapter()
  }
  return storageInstance
}