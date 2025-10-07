import { workbenchXPath, TutorialStep } from "@motiadev/workbench";

export const steps: TutorialStep[] = [
  {
    title: "AI-Powered UGC Video Generation",
    image: {
      height: 200,
      src: "https://github.com/MotiaDev/motia/raw/main/packages/docs/public/github-readme-banner.png",
    },
    description: () => (
      <p>
        Welcome to the UGC Video Generation tutorial! This system demonstrates
        how to build an automated pipeline that transforms product images into
        professional user-generated content (UGC) videos.
        <br />
        <br />
        You'll learn how to analyze product images with AI vision, generate
        multiple content variants, create UGC-style images with Gemini, produce
        videos with Veo 3, and store results in cloud storage - all through an
        event-driven workflow.
        <br />
        <br />
        This example showcases parallel processing, AI integration, and
        multi-step content generation pipelines.
      </p>
    ),
  },

  // Image Upload API

  {
    elementXpath: workbenchXPath.flows.node("imageuploadapi"),
    title: "Image Upload API",
    link: "https://www.motia.dev/docs/concepts/steps/api",
    description: () => (
      <p>
        Let's start with the entry point of our UGC generation system - the{" "}
        <b>Image Upload API</b>.
        <br />
        <br />
        This API endpoint accepts product image URLs and triggers the automated
        UGC video generation workflow. It validates the image accessibility,
        generates unique request IDs, and emits events to start the pipeline.
        <br />
        <br />
        The endpoint immediately emits an <code>image.uploaded</code> event to
        trigger vision analysis.
      </p>
    ),
    before: [
      { type: "click", selector: workbenchXPath.links.flows },
      {
        type: "click",
        selector: workbenchXPath.flows.dropdownFlow("ugc-generation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.flows.previewButton("imageuploadapi"),
    title: "Code Preview",
    description: () => (
      <p>
        Click on this icon to visualize the source code for the Image Upload API
        step.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.closePanelButton,
        optional: true,
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Step Configuration",
    description: () => (
      <p>
        The API step is configured to accept image URLs and trigger the UGC
        generation workflow.
        <br />
        <br />
        The configuration includes the endpoint definition, request validation,
        and event emission setup for the automated content generation pipeline.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("imageuploadapi"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "API Endpoint Definition",
    description: () => (
      <p>
        The API step is configured as a POST endpoint at{" "}
        <code>/ugc/upload</code> that accepts image URLs and triggers the UGC
        generation workflow.
        <br />
        <br />
        Notice how the <b>emits</b> array declares the{" "}
        <code>image.uploaded</code> topic that will trigger the downstream
        vision analysis step.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("api-endpoint"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Request Body Schema",
    description: () => (
      <p>
        The bodySchema defines the structure for image upload requests through a
        Zod schema that supports:
        <br />
        <br />• <b>imageUrl</b> - Required product image URL
        <br />• <b>numVariations</b> - Optional number of content variants to
        generate (default: 1)
        <br />
        <br />
        The schema ensures proper validation and type safety for the UGC
        generation pipeline.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("request-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Emission",
    description: () => (
      <p>
        The API emits <code>image.uploaded</code> events to trigger the UGC
        generation workflow asynchronously.
        <br />
        <br />
        This event-driven architecture allows the system to process images
        asynchronously while immediately responding to the client with a
        submission confirmation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-driven-architecture"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Request Handler",
    description: () => (
      <p>
        The handler processes image upload requests, validates URLs, generates
        unique IDs, and triggers the UGC generation workflow via events.
        <br />
        <br />
        It extracts the image URL and number of variations, validates
        accessibility, and prepares data for the vision analysis pipeline.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("request-handler"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Request ID Generation",
    description: () => (
      <p>
        The system creates unique request identifiers using timestamp and random
        string for tracking throughout the UGC workflow.
        <br />
        <br />
        The request ID follows the pattern:{" "}
        <code>ugc_[timestamp]_[randomString]</code>
        <br />
        <br />
        💡 This ID serves as a unique identifier throughout the entire UGC
        generation workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("request-id-generation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Structured Logging",
    description: () => (
      <p>
        The system logs upload details with structured data including request
        IDs and image URLs for observability.
        <br />
        <br />
        This logging helps with debugging, monitoring, and understanding content
        generation patterns across your platform.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("structured-logging"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image URL Validation",
    description: () => (
      <p>
        The system validates that the provided image URL is accessible by making
        a HEAD request with timeout for reliability.
        <br />
        <br />
        This ensures that only valid, accessible images are processed through
        the expensive UGC generation pipeline, preventing wasted resources.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("url-validation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow Trigger",
    description: () => (
      <p>
        After validation, the API emits a structured event containing the image
        URL and parameters to start the vision analysis and UGC generation
        workflow asynchronously.
        <br />
        <br />
        The event includes the request ID, image URL, number of variations, and
        timestamp needed by downstream steps.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("workflow-trigger"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "API Response",
    description: () => (
      <p>
        The API returns a confirmation response with the request ID, allowing
        clients to track their UGC generation through the process.
        <br />
        <br />
        This immediate response ensures good user experience while the actual
        content generation happens asynchronously in the background.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("http-response"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Error Management",
    description: () => (
      <p>
        Comprehensive error handling for URL validation failures and other
        issues with structured error responses.
        <br />
        <br />
        The system provides clear error messages to help clients understand what
        went wrong during the upload process.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("error-handling"),
      },
    ],
  },

  // Vision Analysis

  {
    elementXpath: workbenchXPath.flows.node("visionanalysisstep"),
    title: "AI Vision Analysis",
    description: () => (
      <p>
        The <b>Vision Analysis Step</b> is the intelligence layer of our UGC
        system. It subscribes to <code>image.uploaded</code> events and uses
        OpenAI's GPT-4 Vision API to analyze product images.
        <br />
        <br />
        The analyzer extracts brand names, product details, color palettes, font
        styles, and visual characteristics needed for authentic UGC content
        generation.
        <br />
        <br />
        💡 This comprehensive analysis ensures the generated content maintains
        brand consistency and authenticity.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Step Configuration",
    description: () => (
      <p>
        The analyzer is configured as an event step that subscribes to
        image.uploaded events and performs AI vision analysis using OpenAI APIs.
        <br />
        <br />
        The step configuration includes subscription setup, handler definition,
        and event emission for downstream content generation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("visionanalysisstep"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Input Schema Definition",
    description: () => (
      <p>
        The input schema defines the expected structure of image upload data
        received from the image.uploaded topic.
        <br />
        <br />
        This ensures type safety and validates that the analyzer receives all
        necessary data including image URL, number of variations, and metadata.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("input-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Subscription",
    description: () => (
      <p>
        Subscribes to <code>image.uploaded</code> events to automatically
        process uploaded images for vision analysis.
        <br />
        <br />
        This event-driven approach enables asynchronous processing and allows
        the system to scale horizontally for high-volume content generation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-subscription"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Event Emission",
    description: () => (
      <p>
        Emits <code>vision.analyzed</code> events to trigger the variant
        generation step with complete product analysis data.
        <br />
        <br />
        This event contains all the extracted brand, product, color, and style
        information needed to generate authentic UGC content.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-emission"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Handler Implementation",
    description: () => (
      <p>
        Main handler that processes image URLs, performs vision analysis with
        OpenAI, and normalizes the results.
        <br />
        <br />
        The handler orchestrates the entire vision analysis pipeline from image
        retrieval to data extraction and event emission.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("handler-implementation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "OpenAI Vision Integration",
    description: () => (
      <p>
        Integrates with OpenAI's GPT-4 Vision API to analyze product images and
        extract comprehensive product information.
        <br />
        <br />
        The API provides detailed insights including brand names, product types,
        color palettes, font styles, and visual characteristics.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("openai-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Structured Vision Prompt",
    description: () => (
      <p>
        Comprehensive prompt that guides the AI to extract specific product
        information in a structured JSON format:
        <br />
        <br />• <b>Brand name</b> - Exact branding as shown
        <br />• <b>Product details</b> - Type and characteristics
        <br />• <b>Color palette</b> - 3-4 prominent colors with hex codes
        <br />• <b>Font style</b> - Typography characteristics
        <br />• <b>Visual guide</b> - Camera angle and lighting notes
        <br />• <b>Ad copy</b> - Concise marketing message
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("vision-prompt"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "JSON Response Parsing",
    description: () => (
      <p>
        Robust parsing of AI-generated JSON responses with error handling and
        cleanup of markdown formatting.
        <br />
        <br />
        The parser handles various response formats and ensures clean, valid
        JSON data for downstream processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("json-parsing"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Data Normalization",
    description: () => (
      <p>
        Normalizes and validates the vision analysis results with fallback
        defaults for missing or invalid data.
        <br />
        <br />
        This ensures consistent data structure for variant generation even when
        the AI response is incomplete or imperfect.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("data-normalization"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Structured Logging",
    description: () => (
      <p>
        Comprehensive logging of analysis progress, results, and errors for
        observability and debugging.
        <br />
        <br />
        The logging provides complete visibility into the vision analysis
        process and helps troubleshoot any issues.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("structured-logging"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Error Management",
    description: () => (
      <p>
        Robust error handling for API failures, JSON parsing errors, and other
        issues with proper error propagation.
        <br />
        <br />
        This ensures the workflow fails gracefully and provides actionable error
        information for debugging.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("error-handling"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow Continuation",
    description: () => (
      <p>
        Emits structured event data with analyzed vision information to continue
        the UGC generation pipeline.
        <br />
        <br />
        The event contains all the brand, product, color, and style data needed
        to generate multiple content variants.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("workflow-continuation"),
      },
    ],
  },

  // Variant Generation

  {
    elementXpath: workbenchXPath.flows.node("variantgenerationstep"),
    title: "Content Variant Generation",
    description: () => (
      <p>
        The <b>Variant Generation Step</b> creates multiple unique content
        variations based on vision analysis. It subscribes to{" "}
        <code>vision.analyzed</code> events and generates diverse prompts.
        <br />
        <br />
        For each variation, it combines different camera angles, lighting
        styles, and marketing headlines with the analyzed brand and product data
        to create authentic UGC-style prompts.
        <br />
        <br />
        💡 This step enables parallel processing - each variant is emitted as a
        separate event for concurrent image and video generation.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Step Configuration",
    description: () => (
      <p>
        The variant generator is configured as an event step that creates
        multiple content variations with different visual styles.
        <br />
        <br />
        The step configuration includes subscription to vision.analyzed events
        and emission setup for parallel variant processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("variantgenerationstep"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Input Schema Definition",
    description: () => (
      <p>
        The input schema accepts vision analysis results including brand data,
        product details, color palettes, and visual characteristics.
        <br />
        <br />
        This comprehensive schema ensures the generator receives all necessary
        data to create authentic, brand-consistent content variants.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("input-schema"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Camera Angle Options",
    description: () => (
      <p>
        Predefined array of professional camera angles for product photography:
        <br />
        <br />
        • Top-down flat lay
        <br />
        • Three-quarter product angle (30°)
        <br />
        • Angled overhead (15° tilt)
        <br />
        • Eye-level hero shot
        <br />
        <br />
        These angles are rotated across variants to create visual diversity
        while maintaining professional quality.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("camera-angles"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Lighting Style Options",
    description: () => (
      <p>
        Array of lighting styles optimized for product photography:
        <br />
        <br />
        • Soft natural daylight
        <br />
        • Bright, even daylight
        <br />
        • Diffused window light
        <br />
        • Soft studio light with diffuser
        <br />
        <br />
        Different lighting creates distinct moods and atmospheres for each
        content variant.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("lighting-styles"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Marketing Headline Seeds",
    description: () => (
      <p>
        Collection of marketing-focused headline phrases for generating
        authentic UGC-style copy:
        <br />
        <br />
        • "instant radiance" • "effortless glow"
        <br />
        • "fresh finish" • "skin-first beauty"
        <br />
        • "everyday dewy" • "natural luminosity"
        <br />
        <br />
        These seeds inspire varied marketing messages across content variants.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("headline-seeds"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Variant Generation Loop",
    description: () => (
      <p>
        Iterates through the requested number of variations, rotating through
        camera angles, lighting, and headline options.
        <br />
        <br />
        Each iteration creates a unique combination of visual and content
        elements for maximum diversity in the generated UGC.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("variant-generation-loop"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image Prompt Construction",
    description: () => (
      <p>
        Builds detailed AI image generation prompts with emotion, action,
        character, product details, and visual styling instructions.
        <br />
        <br />
        The prompts combine analyzed brand data with variant-specific camera
        angles, lighting, and color palettes for authentic UGC-style imagery.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-prompt-creation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Variant Data Structure",
    description: () => (
      <p>
        Creates comprehensive variant objects containing:
        <br />
        <br />
        • Image generation prompts
        <br />
        • Render preferences (aspect ratio, lighting, camera)
        <br />
        • Brand colors (primary, secondary, tertiary)
        <br />
        • Product information (brand, product, watermark)
        <br />
        <br />
        This structured data drives the downstream image and video generation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("variant-object"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Parallel Event Emission",
    description: () => (
      <p>
        Emits each variant as a separate event to enable parallel processing of
        image and video generation downstream.
        <br />
        <br />
        This architecture allows multiple variants to be processed concurrently,
        dramatically reducing total generation time for the workflow.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("parallel-processing"),
      },
    ],
  },

  // Image Generation

  {
    elementXpath: workbenchXPath.flows.node("imagegenerationstep"),
    title: "AI Image Generation",
    description: () => (
      <p>
        The <b>Image Generation Step</b> creates UGC-style product images using
        Google's Gemini AI. It subscribes to <code>variants.generated</code>{" "}
        events and processes each variant independently.
        <br />
        <br />
        Using Gemini 2.5 Flash with image preview capabilities, it transforms
        the original product image according to the variant prompts, creating
        authentic-looking user-generated content.
        <br />
        <br />
        💡 Generated images are uploaded to ImageKit CDN for fast, reliable
        delivery.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Step Configuration",
    description: () => (
      <p>
        The image generator is configured as an event step that creates
        UGC-style images using Google Gemini AI.
        <br />
        <br />
        The step configuration includes subscription to variants.generated
        events and emission setup for triggering video generation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("imagegenerationstep"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Google Gemini Integration",
    description: () => (
      <p>
        Initializes and uses Google's Gemini 2.5 Flash Image Preview model for
        AI-powered image generation.
        <br />
        <br />
        This cutting-edge model can understand the original image and transform
        it according to detailed prompts while maintaining product authenticity.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("gemini-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image Download and Base64 Conversion",
    description: () => (
      <p>
        Downloads the original image from URL and converts it to base64 format
        for Gemini API input.
        <br />
        <br />
        This conversion allows the AI to analyze the original product image and
        generate transformed versions that maintain brand consistency.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-base64-conversion"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "AI Image Generation",
    description: () => (
      <p>
        Generates new UGC-style product images using Gemini with the original
        image and detailed prompt instructions.
        <br />
        <br />
        The AI understands the prompt's camera angle, lighting, color palette,
        and style requirements to create authentic-looking user content.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-generation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Generated Image Extraction",
    description: () => (
      <p>
        Extracts the generated image data from Gemini's response candidates and
        inline data structures.
        <br />
        <br />
        The extraction handles Gemini's response format to retrieve the
        base64-encoded generated image for upload.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-extraction"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "ImageKit Storage Upload",
    description: () => (
      <p>
        Uploads the generated image to ImageKit CDN for persistent storage and
        fast delivery.
        <br />
        <br />
        ImageKit provides optimized image delivery with automatic format
        conversion, compression, and global CDN distribution.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("imagekit-upload"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Filename Sanitization",
    description: () => (
      <p>
        Creates sanitized filenames for uploaded images by replacing special
        characters with underscores.
        <br />
        <br />
        This ensures compatibility with storage systems and maintains clean,
        predictable file naming conventions.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("filename-sanitization"),
      },
    ],
  },

  // Video Generation

  {
    elementXpath: workbenchXPath.flows.node("videogenerationstep"),
    title: "AI Video Generation",
    description: () => (
      <p>
        The <b>Video Generation Step</b> creates UGC videos using Google's
        Vertex AI Veo 3. It subscribes to <code>image.generated</code> events
        and transforms static images into dynamic video content.
        <br />
        <br />
        Veo 3 generates realistic videos showing people authentically presenting
        products, creating the appearance of genuine user-generated content for
        social media marketing.
        <br />
        <br />
        💡 The step implements polling logic to wait for video generation
        completion, which can take several minutes.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Step Configuration",
    description: () => (
      <p>
        The video generator is configured as an event step that creates UGC
        videos using Google Vertex AI Veo 3.
        <br />
        <br />
        The step configuration includes subscription to image.generated events
        and emission setup for triggering file storage.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("videogenerationstep"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Vertex AI Configuration",
    description: () => (
      <p>
        Configuration constants for Google Vertex AI including:
        <br />
        <br />• <b>Project ID</b> - Your Google Cloud project
        <br />• <b>Model ID</b> - Veo 3.0 generate model
        <br />• <b>Location</b> - us-central1 region
        <br />
        <br />
        These settings connect to Google's Veo 3 video generation service.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("vertex-ai-config"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Access Token Helper",
    description: () => (
      <p>
        Helper function to retrieve Vertex AI access token from environment
        variables with validation.
        <br />
        <br />
        The token authenticates API requests to Google Cloud for video
        generation services.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("access-token-helper"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image URL to Base64 Converter",
    description: () => (
      <p>
        Helper function that downloads images from URLs and converts them to
        base64 for Vertex AI API.
        <br />
        <br />
        Veo 3 requires base64-encoded images as input for image-to-video
        generation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-base64-helper"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Video Prompt Creation",
    description: () => (
      <p>
        Constructs detailed video generation prompts describing:
        <br />
        <br />
        • Person presenting the product enthusiastically
        <br />
        • Natural kitchen/casual setting
        <br />
        • Direct eye contact with camera
        <br />
        • Product branding clearly visible
        <br />
        • Authentic UGC style presentation
        <br />
        <br />
        These prompts guide Veo 3 to create realistic, authentic-looking UGC
        videos.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("video-prompt-creation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Vertex AI Video Generation Request",
    description: () => (
      <p>
        Submits long-running video generation request to Veo 3 with:
        <br />
        <br />
        • Base64-encoded source image
        <br />
        • Detailed video prompt
        <br />
        • Aspect ratio (9:16 for social media)
        <br />
        • Resolution (1080p)
        <br />
        <br />
        The API returns an operation name used for polling completion status.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("video-generation-request"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "State Management",
    description: () => (
      <p>
        Stores video generation request information in workflow state for
        tracking and polling status updates.
        <br />
        <br />
        This state allows the system to monitor multiple concurrent video
        generation operations and handle completion properly.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("state-management"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Polling Implementation",
    description: () => (
      <p>
        Polls Vertex AI operation status at 15-second intervals until video
        generation completes or times out.
        <br />
        <br />
        Video generation can take several minutes, so the polling loop checks
        status periodically and processes the video when ready.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("polling-implementation"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Base64 to Video File Conversion",
    description: () => (
      <p>
        Converts the generated video from base64 to MP4 file and saves it to the
        local filesystem.
        <br />
        <br />
        The video file is named with brand, product, variant ID, and timestamp
        for easy identification and organization.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("video-conversion"),
      },
    ],
  },

  // File Storage

  {
    elementXpath: workbenchXPath.flows.node("filestoragestep"),
    title: "Cloud File Storage",
    description: () => (
      <p>
        The <b>File Storage Step</b> completes the UGC workflow by uploading
        generated videos and images to Box cloud storage. It subscribes to{" "}
        <code>video.generated</code> events.
        <br />
        <br />
        This step reads local video files, downloads generated images from CDN,
        and uploads both to Box for long-term storage, organization, and sharing
        with team members.
        <br />
        <br />
        💡 The step emits a final <code>workflow.completed</code> event with
        summary information for tracking and notifications.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Step Configuration",
    description: () => (
      <p>
        The storage handler is configured as an event step that uploads
        generated content to Box cloud storage.
        <br />
        <br />
        The step configuration includes subscription to video.generated events
        and emission setup for workflow completion tracking.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("filestoragestep"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("step-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Box Storage Configuration",
    description: () => (
      <p>
        Retrieves Box access token and folder ID from environment variables with
        validation.
        <br />
        <br />
        These credentials authenticate uploads to Box and specify the target
        folder for organizing generated UGC content.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("box-configuration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Video File Upload to Box",
    description: () => (
      <p>
        Reads local video file, creates form data with metadata, and uploads to
        Box with proper authorization.
        <br />
        <br />
        The upload includes file attributes specifying the filename and parent
        folder for proper organization in Box.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("video-upload"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Image Download and Box Upload",
    description: () => (
      <p>
        Downloads generated image from ImageKit CDN, converts to buffer, and
        uploads to Box storage with sanitized filename.
        <br />
        <br />
        This ensures both the video and its source image are stored together in
        Box for complete content management.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-download-upload"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Box API Integration",
    description: () => (
      <p>
        Integrates with Box Content API for file uploads using FormData and
        Bearer token authentication.
        <br />
        <br />
        The Box API provides reliable, enterprise-grade cloud storage with
        built-in sharing, permissions, and collaboration features.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("box-api-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Uploaded Files Tracking",
    description: () => (
      <p>
        Maintains array of uploaded file metadata including:
        <br />
        <br />
        • Box file IDs for reference
        <br />
        • Direct Box URLs for access
        <br />
        • File types (video/image)
        <br />
        • Original sources
        <br />
        <br />
        This tracking provides complete audit trail of generated content.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("uploaded-files-tracking"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow State Update",
    description: () => (
      <p>
        Updates workflow state with completion status, uploaded files, variant
        details, and completion timestamp.
        <br />
        <br />
        This final state update creates a complete record of the entire UGC
        generation process for analytics and reporting.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("workflow-state-update"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Completion Summary",
    description: () => (
      <p>
        Creates comprehensive workflow summary including:
        <br />
        <br />
        • Brand and product details
        <br />
        • Camera settings and lighting used
        <br />
        • Number of files successfully stored
        <br />
        • Final workflow status
        <br />
        <br />
        This summary enables easy tracking and reporting of UGC generation
        results.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("completion-summary"),
      },
    ],
  },

  // Testing the System

  {
    elementXpath: workbenchXPath.links.endpoints,
    title: "Testing UGC Generation",
    description: () => (
      <p>
        Now let's test the UGC generation system! Click on the <b>Endpoints</b>{" "}
        section to access the image upload API.
        <br />
        <br />
        You'll be able to submit product image URLs and see how the entire
        AI-powered pipeline generates professional UGC videos automatically.
        <br />
        <br />
        💡 Make sure your API keys are configured for OpenAI, Gemini, Veo 3, and
        Box to see the full workflow.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },
  {
    elementXpath: workbenchXPath.endpoints.endpoint("POST", "/ugc/upload"),
    title: "Image Upload Endpoint",
    description: () => (
      <p>
        This is the main UGC generation endpoint. Click on it to open the
        testing interface where you can submit product image URLs.
        <br />
        <br />
        The endpoint accepts POST requests with JSON payloads containing image
        URLs and optional variation counts.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.endpoints }],
  },
  {
    elementXpath: workbenchXPath.endpoints.callPanel,
    title: "Testing Interface",
    description: () => (
      <p>
        Use this form to test different product images:
        <br />
        <br />• <b>Product images</b> - Clear product photos with visible
        branding
        <br />• <b>Number of variations</b> - How many UGC variants to generate
        (1-4 recommended)
        <br />
        <br />
        Try submitting a product image URL and watch the AI pipeline generate
        multiple UGC videos automatically!
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.endpoints.endpoint("POST", "/ugc/upload"),
      },
      { type: "click", selector: workbenchXPath.endpoints.callTab },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.playButton,
    title: "Submit Product Image",
    description: () => (
      <p>
        Click the <b>Play</b> button to submit your product image to the UGC
        generation system.
        <br />
        <br />
        You'll receive a response with a request ID that you can use to track
        the content through the generation workflow.
      </p>
    ),
    before: [
      {
        type: "fill-editor",
        content: {
          imageUrl: "https://example.com/product-image.jpg",
          numVariations: 2,
        },
      },
    ],
  },
  {
    elementXpath: workbenchXPath.endpoints.response,
    title: "Upload Response",
    description: () => (
      <p>
        Once your image is submitted, you'll see the response containing:
        <br />
        <br />• <b>Request ID</b> - Unique identifier for tracking
        <br />• <b>Confirmation message</b> - Success confirmation
        <br />
        <br />
        The UGC generation workflow is now running asynchronously in the
        background! The process may take several minutes to complete.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.endpoints.playButton }],
  },

  // Observability

  {
    elementXpath: workbenchXPath.links.tracing,
    title: "Workflow Observability",
    description: () => (
      <p>
        After submitting an image, use Motia's observability tools to track the
        UGC generation workflow.
        <br />
        <br />
        The <b>Tracing</b> section shows how your image flows through each step:
        upload → vision analysis → variant generation → image generation → video
        generation → file storage.
        <br />
        <br />
        Each step is traced with timing information and logs for complete
        visibility into the AI-powered content generation pipeline.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.tracing }],
  },
  {
    elementXpath: workbenchXPath.tracing.trace(1),
    title: "UGC Generation Workflow Trace",
    description: () => (
      <p>
        Click on the most recent trace to see the complete UGC generation
        workflow execution.
        <br />
        <br />
        You'll see each step's execution time, success status, and any logs
        generated during processing. This helps you understand the flow and
        debug any issues.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.tracing.trace(1) }],
  },
  {
    elementXpath: workbenchXPath.tracing.details,
    title: "Step-by-Step Analysis",
    description: () => (
      <p>
        The trace timeline shows you exactly how your image moved through the
        UGC generation pipeline:
        <br />
        <br />
        1. <b>ImageUploadAPI</b> - Initial image submission
        <br />
        2. <b>VisionAnalysisStep</b> - AI brand and product analysis
        <br />
        3. <b>VariantGenerationStep</b> - Multiple variant creation
        <br />
        4. <b>ImageGenerationStep</b> - Gemini image generation (parallel)
        <br />
        5. <b>VideoGenerationStep</b> - Veo 3 video creation (parallel)
        <br />
        6. <b>FileStorageStep</b> - Box cloud upload
        <br />
        <br />
        Click on any step to see detailed logs and execution information.
      </p>
    ),
  },
  {
    elementXpath: workbenchXPath.tracing.timeline(1),
    title: "Timeline Analysis",
    description: () => (
      <p>
        Each timeline segment shows the execution time and status of individual
        steps.
        <br />
        <br />
        You can see how long vision analysis takes, when images generate, video
        generation duration, and identify any bottlenecks in your UGC pipeline.
      </p>
    ),
  },

  // State Management

  {
    elementXpath: workbenchXPath.links.states,
    title: "UGC Workflow State Tracking",
    description: () => (
      <p>
        The <b>State Management</b> tool shows all persisted data from your UGC
        generation workflows.
        <br />
        <br />
        Each request is stored with keys for video requests, workflow
        completion, and generated content metadata.
        <br />
        <br />
        This provides a complete audit trail for tracking generated content and
        workflow analytics.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.links.states }],
  },
  {
    elementXpath: workbenchXPath.states.container,
    title: "Generated Content Data",
    description: () => (
      <p>
        Click on any state entry to see the complete UGC generation record
        including:
        <br />
        <br />
        • Original product image URL
        <br />
        • Vision analysis results (brand, colors, styles)
        <br />
        • Generated variant details
        <br />
        • Image and video URLs
        <br />
        • Box storage file IDs
        <br />
        • Completion timestamps
        <br />
        <br />
        This data structure supports content management and workflow analytics.
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.states.row(1) }],
  },

  // Production Configuration

  {
    title: "Production Configuration",
    description: () => (
      <p>
        To deploy this UGC generation system in production, you'll need to
        configure:
        <br />
        <br />
        <b>OpenAI Integration:</b>
        <br />• Set <code>OPENAI_API_KEY</code> environment variable
        <br />
        <br />
        <b>Google Gemini Integration:</b>
        <br />• Set <code>GOOGLE_GEMINI_API_KEY</code> for image generation
        <br />
        <br />
        <b>Google Vertex AI Veo 3:</b>
        <br />• Set <code>VERTEX_ACCESS_TOKEN</code> for video generation
        <br />• Set <code>VERTEX_PROJECT_ID</code> for your GCP project
        <br />
        <br />
        <b>ImageKit Integration:</b>
        <br />• Set <code>IMAGEKIT_PRIVATE_KEY</code> and{" "}
        <code>IMAGEKIT_PASSWORD</code>
        <br />
        <br />
        <b>Box Storage:</b>
        <br />• Set <code>BOX_ACCESS_TOKEN</code> for cloud storage
        <br />• Set <code>BOX_ROOT_FOLDER_ID</code> for file organization
      </p>
    ),
    before: [{ type: "click", selector: workbenchXPath.closePanelButton }],
  },

  // Conclusion

  {
    title: "UGC Video Generation Completion!",
    link: "https://www.motia.dev/docs/examples/ugc-workflow",
    description: () => (
      <p>
        Congratulations! You've built a complete AI-powered UGC video generation
        system with:
        <br />
        <br />✅ <b>AI vision analysis</b> - Brand and product extraction
        <br />✅ <b>Variant generation</b> - Multiple content variations
        <br />✅ <b>Image generation</b> - Gemini-powered UGC images
        <br />✅ <b>Video generation</b> - Veo 3 realistic videos
        <br />✅ <b>Cloud storage</b> - Box integration for files
        <br />✅ <b>Parallel processing</b> - Concurrent variant generation
        <br />✅ <b>Event-driven design</b> - Scalable async processing
        <br />
        <br />
        You can adapt this system for different content types and marketing
        campaigns.
        <br />
        <br />
        Check out the{" "}
        <a
          href="https://github.com/MotiaDev/motia/tree/main/examples/ugc-workflow"
          target="_blank"
          rel="noopener noreferrer"
        >
          source code
        </a>{" "}
        and join our{" "}
        <a
          href="https://discord.com/invite/nJFfsH5d6v"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord
        </a>{" "}
        to share your use cases!
        <br />
        <br />
        Ready to build more? Explore other Motia examples or create your own
        AI-powered workflows.
      </p>
    ),
  },
];
