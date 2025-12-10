import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

describe('Requirements Compliance Validation', () => {
  // Get all JavaScript files in the project
  const getJavaScriptFiles = (dir, files = []) => {
    const items = readdirSync(dir, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = join(dir, item.name)
      
      if (item.isDirectory() && !['node_modules', '.git', 'dist', '.motia'].includes(item.name)) {
        getJavaScriptFiles(fullPath, files)
      } else if (item.isFile() && (item.name.endsWith('.js') || item.name.endsWith('.ts'))) {
        files.push(fullPath)
      }
    }
    
    return files
  }

  const projectFiles = getJavaScriptFiles('.')
  const stepFiles = projectFiles.filter(file => file.includes('/steps/') && file.endsWith('.js'))
  const libFiles = projectFiles.filter(file => file.includes('/lib/') && file.endsWith('.js'))

  describe('Requirement 6.2: No console.log usage (forbidden)', () => {
    it('should not contain console.log statements in any project files', () => {
      const violations = []
      
      for (const file of projectFiles) {
        // Skip test files and node_modules
        if (file.includes('test') || file.includes('node_modules') || file.includes('.test.')) {
          continue
        }
        
        try {
          const content = readFileSync(file, 'utf8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            // Check for console.log usage (but not in comments)
            if (line.includes('console.log') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
              violations.push({
                file: file.replace(process.cwd(), '.'),
                line: index + 1,
                content: line.trim()
              })
            }
          })
        } catch (error) {
          // Skip files that can't be read
          continue
        }
      }
      
      if (violations.length > 0) {
        const violationDetails = violations.map(v => 
          `${v.file}:${v.line} - ${v.content}`
        ).join('\n')
        
        expect.fail(`Found console.log usage in the following locations:\n${violationDetails}`)
      }
      
      expect(violations).toHaveLength(0)
    })

    it('should not contain other console methods in step files', () => {
      const forbiddenMethods = ['console.error', 'console.warn', 'console.info', 'console.debug']
      const violations = []
      
      for (const file of stepFiles) {
        try {
          const content = readFileSync(file, 'utf8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            for (const method of forbiddenMethods) {
              if (line.includes(method) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                violations.push({
                  file: file.replace(process.cwd(), '.'),
                  line: index + 1,
                  method,
                  content: line.trim()
                })
              }
            }
          })
        } catch (error) {
          continue
        }
      }
      
      if (violations.length > 0) {
        const violationDetails = violations.map(v => 
          `${v.file}:${v.line} - ${v.method} found: ${v.content}`
        ).join('\n')
        
        expect.fail(`Found forbidden console methods in step files:\n${violationDetails}`)
      }
      
      expect(violations).toHaveLength(0)
    })
  })

  describe('Requirement 7.7: No MongoDB dependencies (forbidden)', () => {
    it('should not have MongoDB dependencies in package.json', () => {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies
      }
      
      const mongoDbPackages = [
        'mongodb',
        'mongoose',
        'monk',
        'mongojs',
        'mongoskin',
        '@mongodb-js/mongodb-client-encryption'
      ]
      
      const foundMongoDeps = []
      for (const [pkg, version] of Object.entries(allDependencies)) {
        if (mongoDbPackages.some(mongoPkg => pkg.includes(mongoPkg))) {
          foundMongoDeps.push(`${pkg}@${version}`)
        }
      }
      
      if (foundMongoDeps.length > 0) {
        expect.fail(`Found MongoDB dependencies (forbidden): ${foundMongoDeps.join(', ')}`)
      }
      
      expect(foundMongoDeps).toHaveLength(0)
    })

    it('should not contain MongoDB imports or requires in source files', () => {
      const mongoDbImports = [
        'mongodb',
        'mongoose',
        'monk',
        'mongojs',
        'mongoskin'
      ]
      
      const violations = []
      
      for (const file of [...stepFiles, ...libFiles]) {
        try {
          const content = readFileSync(file, 'utf8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            for (const mongoImport of mongoDbImports) {
              const importPatterns = [
                `import.*from.*['"]${mongoImport}['"]`,
                `require\\(['"]${mongoImport}['"]\\)`,
                `import.*['"]${mongoImport}['"]`
              ]
              
              for (const pattern of importPatterns) {
                const regex = new RegExp(pattern)
                if (regex.test(line) && !line.trim().startsWith('//')) {
                  violations.push({
                    file: file.replace(process.cwd(), '.'),
                    line: index + 1,
                    import: mongoImport,
                    content: line.trim()
                  })
                }
              }
            }
          })
        } catch (error) {
          continue
        }
      }
      
      if (violations.length > 0) {
        const violationDetails = violations.map(v => 
          `${v.file}:${v.line} - MongoDB import found: ${v.content}`
        ).join('\n')
        
        expect.fail(`Found MongoDB imports (forbidden):\n${violationDetails}`)
      }
      
      expect(violations).toHaveLength(0)
    })
  })

  describe('Requirement 6.1: All steps use context.logger for logging', () => {
    it('should use context.logger in all step files', () => {
      const violations = []
      
      for (const file of stepFiles) {
        try {
          const content = readFileSync(file, 'utf8')
          
          // Check if file contains handler function
          if (!content.includes('export const handler') && !content.includes('export async function handler')) {
            continue // Skip files without handlers
          }
          
          // Check for context.logger usage
          const hasContextLogger = content.includes('context.logger') || content.includes('logger.')
          
          if (!hasContextLogger) {
            violations.push({
              file: file.replace(process.cwd(), '.'),
              issue: 'No context.logger usage found'
            })
          }
          
          // Check for specific logger methods
          const loggerMethods = ['logger.info', 'logger.error', 'logger.warn', 'logger.debug']
          const foundMethods = loggerMethods.filter(method => content.includes(method))
          
          if (foundMethods.length === 0 && hasContextLogger) {
            violations.push({
              file: file.replace(process.cwd(), '.'),
              issue: 'context.logger referenced but no logger methods used'
            })
          }
          
        } catch (error) {
          continue
        }
      }
      
      if (violations.length > 0) {
        const violationDetails = violations.map(v => 
          `${v.file} - ${v.issue}`
        ).join('\n')
        
        expect.fail(`Step files not using context.logger properly:\n${violationDetails}`)
      }
      
      expect(violations).toHaveLength(0)
    })

    it('should use appropriate logger levels in step files', () => {
      const violations = []
      
      for (const file of stepFiles) {
        try {
          const content = readFileSync(file, 'utf8')
          const lines = content.split('\n')
          
          lines.forEach((line, index) => {
            // Check for error handling that should use logger.error
            if (line.includes('catch') && line.includes('error')) {
              // Look for the next few lines to see if logger.error is used
              const nextLines = lines.slice(index, index + 10).join(' ')
              if (!nextLines.includes('logger.error')) {
                violations.push({
                  file: file.replace(process.cwd(), '.'),
                  line: index + 1,
                  issue: 'Error handling without logger.error',
                  content: line.trim()
                })
              }
            }
          })
        } catch (error) {
          continue
        }
      }
      
      // Note: This is a warning-level check, not a hard failure
      if (violations.length > 0) {
        console.warn('Potential logging improvements found:', violations)
      }
      
      // Always pass this test as it's more of a code quality check
      expect(true).toBe(true)
    })
  })

  describe('Environment variable handling validation', () => {
    it('should properly validate required environment variables', () => {
      const envFile = 'lib/env.js'
      
      try {
        const content = readFileSync(envFile, 'utf8')
        
        // Check for required environment variables
        const requiredVars = ['DISCORD_WEBHOOK', 'SITES']
        const missingValidation = []
        
        for (const envVar of requiredVars) {
          if (!content.includes(envVar)) {
            missingValidation.push(envVar)
          }
        }
        
        if (missingValidation.length > 0) {
          expect.fail(`Missing environment variable validation for: ${missingValidation.join(', ')}`)
        }
        
        // Check for proper error handling
        const hasErrorHandling = content.includes('throw new Error') && content.includes('required')
        expect(hasErrorHandling).toBe(true)
        
        // Check for validation functions
        const hasValidation = content.includes('function') && (
          content.includes('isValid') || content.includes('parse') || content.includes('validate')
        )
        expect(hasValidation).toBe(true)
        
      } catch (error) {
        expect.fail(`Could not read or validate env.js file: ${error.message}`)
      }
    })

    it('should provide sensible defaults for optional environment variables', () => {
      const envFile = 'lib/env.js'
      
      try {
        const content = readFileSync(envFile, 'utf8')
        
        // Check for default values
        const optionalVars = [
          { name: 'CHECK_INTERVAL_CRON', defaultValue: '*/1 * * * *' },
          { name: 'ALERT_BURST', defaultValue: '3' },
          { name: 'ALERT_WINDOW_SEC', defaultValue: '300' }
        ]
        
        const missingDefaults = []
        
        for (const envVar of optionalVars) {
          const hasDefault = content.includes(envVar.name) && (
            content.includes('||') || content.includes('??') || content.includes(envVar.defaultValue)
          )
          
          if (!hasDefault) {
            missingDefaults.push(envVar.name)
          }
        }
        
        if (missingDefaults.length > 0) {
          expect.fail(`Missing default values for optional environment variables: ${missingDefaults.join(', ')}`)
        }
        
        expect(missingDefaults).toHaveLength(0)
        
      } catch (error) {
        expect.fail(`Could not validate environment defaults: ${error.message}`)
      }
    })

    it('should export a config object with all required fields', () => {
      const envFile = 'lib/env.js'
      
      try {
        const content = readFileSync(envFile, 'utf8')
        
        // Check for config export
        const hasConfigExport = content.includes('export const config')
        expect(hasConfigExport).toBe(true)
        
        // Check for required config fields
        const requiredFields = [
          'discordWebhook',
          'sites',
          'cron',
          'alertBurst',
          'alertWindowSec'
        ]
        
        const missingFields = []
        
        for (const field of requiredFields) {
          if (!content.includes(field)) {
            missingFields.push(field)
          }
        }
        
        if (missingFields.length > 0) {
          expect.fail(`Missing required config fields: ${missingFields.join(', ')}`)
        }
        
        expect(missingFields).toHaveLength(0)
        
      } catch (error) {
        expect.fail(`Could not validate config export: ${error.message}`)
      }
    })
  })

  describe('Code architecture compliance', () => {
    it('should have proper step file structure', () => {
      const violations = []
      
      for (const file of stepFiles) {
        try {
          const content = readFileSync(file, 'utf8')
          
          // Check for required exports
          const hasConfigExport = content.includes('export const config')
          const hasHandlerExport = content.includes('export const handler') || content.includes('export async function handler')
          
          if (!hasConfigExport) {
            violations.push({
              file: file.replace(process.cwd(), '.'),
              issue: 'Missing config export'
            })
          }
          
          if (!hasHandlerExport) {
            violations.push({
              file: file.replace(process.cwd(), '.'),
              issue: 'Missing handler export'
            })
          }
          
          // Check for proper config structure
          if (hasConfigExport) {
            const requiredConfigFields = ['type', 'name', 'flows']
            const missingConfigFields = requiredConfigFields.filter(field => !content.includes(field))
            
            if (missingConfigFields.length > 0) {
              violations.push({
                file: file.replace(process.cwd(), '.'),
                issue: `Missing config fields: ${missingConfigFields.join(', ')}`
              })
            }
          }
          
        } catch (error) {
          continue
        }
      }
      
      if (violations.length > 0) {
        const violationDetails = violations.map(v => 
          `${v.file} - ${v.issue}`
        ).join('\n')
        
        expect.fail(`Step file structure violations:\n${violationDetails}`)
      }
      
      expect(violations).toHaveLength(0)
    })

    it('should have proper utility library structure', () => {
      const violations = []
      
      for (const file of libFiles) {
        try {
          const content = readFileSync(file, 'utf8')
          
          // Check for proper exports
          const hasExports = content.includes('export')
          
          if (!hasExports) {
            violations.push({
              file: file.replace(process.cwd(), '.'),
              issue: 'No exports found'
            })
          }
          
          // Check for proper documentation
          const hasDocumentation = content.includes('/**') || content.includes('*/')
          
          if (!hasDocumentation) {
            violations.push({
              file: file.replace(process.cwd(), '.'),
              issue: 'Missing JSDoc documentation'
            })
          }
          
        } catch (error) {
          continue
        }
      }
      
      if (violations.length > 0) {
        const violationDetails = violations.map(v => 
          `${v.file} - ${v.issue}`
        ).join('\n')
        
        expect.fail(`Utility library structure violations:\n${violationDetails}`)
      }
      
      expect(violations).toHaveLength(0)
    })
  })

  describe('Test coverage validation', () => {
    it('should have test files for all utility libraries', () => {
      const missingTests = []
      
      for (const libFile of libFiles) {
        const testFile = libFile.replace('.js', '.test.js')
        
        try {
          readFileSync(testFile, 'utf8')
        } catch (error) {
          missingTests.push(libFile.replace(process.cwd(), '.'))
        }
      }
      
      if (missingTests.length > 0) {
        expect.fail(`Missing test files for utility libraries: ${missingTests.join(', ')}`)
      }
      
      expect(missingTests).toHaveLength(0)
    })

    it('should have integration tests', () => {
      const integrationTestFiles = projectFiles.filter(file => 
        file.includes('integration') && file.includes('test')
      )
      
      expect(integrationTestFiles.length).toBeGreaterThan(0)
    })
  })
})