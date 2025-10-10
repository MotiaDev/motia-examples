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
        videos with Veo 3, and store results in cloud storage, all through an
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
        This comprehensive analysis ensures the generated content maintains
        brand consistency and authenticity.
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
    title: "Python Step Configuration",
    description: () => (
      <p>
        The analyzer is implemented as a Python event step using a dict-based
        config that subscribes to <code>image.uploaded</code> events and emits{" "}
        <code>vision.analyzed</code> events.
        <br />
        <br />
        The Python implementation leverages async/await with aiohttp for
        efficient HTTP requests to OpenAI's Vision API, providing fast parallel
        image analysis.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.previewButton("visionanalysisstep"),
      },
      {
        type: "click",
        selector: workbenchXPath.flows.feature("config-definition"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Structured Vision Prompt",
    description: () => (
      <p>
        Comprehensive prompt engineering that extracts brand name, product type,
        colors, visual guide, ad copy, and styling from product images:
        <br />
        <br />• <b>Brand name</b> - Exact branding as printed on packaging
        <br />• <b>Product details</b> - Specific product type and
        characteristics
        <br />• <b>Color palette</b> - 3-4 dominant colors with hex codes and
        names
        <br />• <b>Font style</b> - Typography characteristics (serif, bold,
        etc.)
        <br />• <b>Visual guide</b> - Camera angles, lighting, and style notes
        <br />• <b>Ad copy</b> - Concise marketing message (20-35 characters)
        <br />
        <br />
        This structured approach ensures consistent, high-quality data for UGC
        generation.
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
    title: "Async OpenAI API Integration",
    description: () => (
      <p>
        Uses aiohttp for async HTTP requests to OpenAI's GPT-4o Vision API with
        proper error handling and authentication.
        <br />
        <br />
        The async implementation enables efficient parallel processing of
        multiple product images, significantly improving throughput for
        high-volume UGC generation workflows.
        <br />
        <br />
        API responses are validated for status codes and parsed as JSON for
        downstream processing.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("aiohttp-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "JSON Response Parsing",
    description: () => (
      <p>
        Robust parsing of AI JSON responses with markdown cleanup and error
        handling for malformed output.
        <br />
        <br />
        The parser strips markdown code fences (```json blocks), handles various
        AI response formats, and validates JSON structure before processing.
        This ensures reliable data extraction even when the AI returns slightly
        malformed responses.
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
    title: "Data Normalization with Defaults",
    description: () => (
      <p>
        Normalizes vision analysis results with fallback defaults for missing
        fields and extracts primary, secondary, and tertiary colors from the
        palette array.
        <br />
        <br />
        The normalization ensures every field has a valid value, preventing
        downstream errors. It intelligently extracts color values from the
        palette and provides sensible defaults for brand names, product types,
        and visual characteristics when data is missing.
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
    title: "Event Emission for Variant Generation",
    description: () => (
      <p>
        Emits structured <code>vision.analyzed</code> event with normalized data
        to trigger variant generation in the UGC pipeline.
        <br />
        <br />
        The event contains all extracted brand information, product details,
        color palettes, font styles, and visual characteristics needed for
        downstream steps to generate authentic, brand-consistent UGC content
        variants.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-emission"),
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
    title: "Event Step Configuration",
    description: () => (
      <p>
        The variant generator is configured as an event step that subscribes to{" "}
        <code>vision.analyzed</code> events and emits{" "}
        <code>variants.generated</code> events for parallel processing.
        <br />
        <br />
        This event-driven architecture enables each variant to be processed
        independently and concurrently in downstream image and video generation
        steps, significantly improving throughput.
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
    title: "Visual Variation Options",
    description: () => (
      <p>
        Predefined arrays of camera angles, lighting styles, and marketing
        headline seeds that create diverse content variations:
        <br />
        <br />
        <b>Camera Angles:</b> Top-down flat lay • Three-quarter product angle
        (30°) • Angled overhead (15° tilt) • Eye-level hero shot
        <br />
        <br />
        <b>Lighting Styles:</b> Soft natural daylight • Bright, even daylight •
        Diffused window light • Soft studio light with diffuser
        <br />
        <br />
        <b>Headline Seeds:</b> "instant radiance" • "effortless glow" • "fresh
        finish" • "skin-first beauty" • "everyday dewy" • "natural luminosity"
        <br />
        <br />
        These options are rotated across variants to maximize visual and content
        diversity while maintaining brand authenticity.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("variation-options"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Variant Generation Loop",
    description: () => (
      <p>
        Iterates through requested variations, rotating through camera angles,
        lighting styles, and headlines to create unique combinations for each
        variant.
        <br />
        <br />
        The loop uses modulo arithmetic to cycle through the predefined options,
        ensuring each variant has a distinct visual style and marketing message
        for maximum content diversity in the UGC pipeline.
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
    title: "AI Image Prompt Construction",
    description: () => (
      <p>
        Builds detailed prompts combining emotion, action, character
        descriptions, product details, and visual styling instructions for
        authentic UGC-style image generation.
        <br />
        <br />
        Each prompt integrates the analyzed brand data (colors, fonts, visual
        guide) with variant-specific settings (camera angle, lighting) to create
        cohesive, brand-consistent UGC content that feels genuine and
        user-generated.
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
        Creates comprehensive variant objects with image prompts, render
        preferences (aspect ratio, lighting, camera, depth of field), brand
        colors, and product information for downstream processing.
        <br />
        <br />
        This structured data package contains everything needed by the image
        generation (Gemini) and video generation (Veo 3) steps to create
        consistent, high-quality UGC content that maintains brand authenticity
        across all variants.
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
        Emits each variant as a separate event to enable concurrent image and
        video generation, dramatically reducing total workflow processing time.
        <br />
        <br />
        This parallel architecture is key to scalability - instead of generating
        content sequentially, all variants process simultaneously through Gemini
        and Veo 3, allowing production of multiple UGC assets in the time it
        would take to create just one.
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
        Event step that subscribes to <code>variants.generated</code> events and
        emits <code>image.generated</code> events to trigger video generation.
        <br />
        <br />
        Each variant is processed independently, allowing parallel image
        generation across multiple variants for faster workflow completion and
        higher throughput.
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
    title: "Gemini AI Integration",
    description: () => (
      <p>
        Initializes Google's Gemini 2.5 Flash Image Preview model for AI-powered
        UGC-style image generation with multimodal capabilities.
        <br />
        <br />
        This cutting-edge model combines vision understanding with generative
        capabilities, allowing it to analyze the original product image and
        transform it according to detailed prompts while maintaining product
        authenticity and brand consistency.
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
    title: "AI Image Generation",
    description: () => (
      <p>
        Downloads original image, converts to base64, and generates new
        UGC-style images using Gemini with detailed variant prompts including
        camera angles, lighting, and brand styling.
        <br />
        <br />
        The generation process combines the original product image with the
        variant's specific instructions (camera angle, lighting style, color
        palette) to create authentic-looking user-generated content that
        maintains brand consistency while appearing natural and spontaneous.
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
    title: "Image Extraction",
    description: () => (
      <p>
        Extracts generated image data from Gemini's response candidates and
        inline data structures, handling the API response format.
        <br />
        <br />
        The extraction process navigates Gemini's response structure to locate
        and retrieve the base64-encoded generated image, ensuring robust
        handling of the API's response format variations.
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
    title: "ImageKit CDN Upload",
    description: () => (
      <p>
        Uploads generated images to ImageKit CDN with sanitized filenames for
        persistent storage, fast delivery, and global distribution.
        <br />
        <br />
        ImageKit provides optimized image delivery with automatic format
        conversion, compression, and global CDN distribution, ensuring fast load
        times and reliable access to generated UGC content from anywhere in the
        world.
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
    title: "Event Emission",
    description: () => (
      <p>
        Emits <code>image.generated</code> events with CDN URLs and variant
        metadata to trigger downstream video generation with Veo 3.
        <br />
        <br />
        The emitted event contains the generated image URL from ImageKit, along
        with all variant metadata, enabling the video generation step to create
        UGC videos based on the generated images while maintaining the full
        context of the variant's styling and branding.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("event-emission"),
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
        Event step that subscribes to <code>image.generated</code> events and
        emits <code>video.generated</code> events to trigger file storage and
        workflow completion.
        <br />
        <br />
        Each generated image triggers independent video generation, enabling
        parallel processing of multiple UGC video variants simultaneously for
        optimal workflow performance.
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
    title: "Veo 3 Integration",
    description: () => (
      <p>
        Configures Google Vertex AI Veo 3.0 with project ID, model settings
        (veo-3.0-generate-001), authentication tokens, and helper functions for
        image-to-base64 conversion.
        <br />
        <br />
        The integration includes configuration for Google Cloud project
        (us-central1 region), access token authentication via environment
        variables, and utilities to download images from URLs and convert them
        to base64 format required by Veo 3's API for image-to-video generation.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("veo3-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Video Prompt Creation",
    description: () => (
      <p>
        Constructs detailed prompts describing confident person presenting
        product in casual kitchen setting with natural UGC-style presentation,
        direct eye contact, and visible branding.
        <br />
        <br />
        The prompts are carefully crafted to guide Veo 3 in creating realistic,
        authentic-looking UGC videos that show people enthusiastically
        presenting products as friends would on social media. Key elements
        include: natural kitchen/casual setting, confident presenter making
        direct eye contact, product branding clearly visible, and authentic
        social media presentation style.
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
    title: "Video Generation Request",
    description: () => (
      <p>
        Submits long-running request to Veo 3 with base64 image, detailed
        prompt, 9:16 aspect ratio for social media, and 1080p resolution,
        returning operation name for status polling.
        <br />
        <br />
        The request includes the generated UGC-style image as base64, the video
        prompt describing the desired presentation, 9:16 vertical aspect ratio
        optimized for Instagram Reels, TikTok, and YouTube Shorts, and 1080p
        resolution for high-quality output. The API returns an operation name
        used to poll for completion.
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
    title: "Status Polling",
    description: () => (
      <p>
        Polls Vertex AI operation status every 15 seconds (up to 20 attempts)
        until video generation completes, handling async nature of video
        generation that can take several minutes.
        <br />
        <br />
        Video generation is a long-running operation that can take 3-5 minutes
        or more. The polling mechanism checks the operation status at 15-second
        intervals, handling the asynchronous nature of the video generation
        process. With a maximum of 20 attempts (5 minutes), the system ensures
        completion tracking while preventing indefinite waiting.
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
    title: "Video File Conversion",
    description: () => (
      <p>
        Converts generated video from base64 to MP4 file, saves to local
        filesystem with sanitized filename
        (brand_product_variant_timestamp.mp4), and emits event with file path.
        <br />
        <br />
        Once video generation completes, the base64-encoded video data is
        converted to an MP4 file and saved locally with a descriptive filename
        format that includes the brand name, product type, variant ID, and
        timestamp. An event is then emitted with the file path to trigger the
        final storage step for uploading to Box cloud storage.
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
        Event step that subscribes to <code>video.generated</code> events and
        emits <code>workflow.completed</code> events to finalize the UGC
        generation pipeline.
        <br />
        <br />
        This final step completes the workflow by persisting all generated
        content to cloud storage, providing a complete audit trail, and
        signaling successful completion to downstream systems or notification
        services.
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
    title: "Box Cloud Storage Integration",
    description: () => (
      <p>
        Configures Box API with access tokens and folder IDs from environment
        variables, using FormData and Bearer token authentication for file
        uploads to Box Content API.
        <br />
        <br />
        The Box integration provides enterprise-grade cloud storage with
        built-in sharing, permissions, and collaboration features. Configuration
        includes authentication tokens, target folder IDs for organizing
        content, and the necessary headers and request formatting for the Box
        Content API.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("box-integration"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Video File Upload",
    description: () => (
      <p>
        Reads local MP4 video file, creates sanitized filename, and uploads to
        Box storage with metadata including file attributes and parent folder
        specification.
        <br />
        <br />
        The video upload process reads the generated MP4 file from the local
        filesystem, sanitizes the filename by replacing special characters with
        underscores, creates FormData with the video buffer and metadata, and
        uploads to Box with proper authorization and folder organization.
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
    title: "Image Download and Upload",
    description: () => (
      <p>
        Downloads generated UGC image from ImageKit CDN, converts to buffer, and
        uploads to Box storage with sanitized filename to store both video and
        source image together.
        <br />
        <br />
        This ensures complete content management by keeping the generated video
        and its source UGC-style image together in Box. The process downloads
        the image from ImageKit's CDN, converts it to a buffer, and uploads it
        alongside the video for easy reference and content organization.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("image-upload"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow State Management",
    description: () => (
      <p>
        Updates workflow state with completion status, tracks uploaded file
        metadata (Box IDs, URLs, types), variant details, and completion
        timestamp for audit trail.
        <br />
        <br />
        The state management system maintains a complete record of the workflow
        including all uploaded files with their Box IDs and URLs, variant
        configurations used, processing timestamps, and final completion status.
        This provides a comprehensive audit trail for analytics, reporting, and
        content tracking across the UGC generation pipeline.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("workflow-state"),
      },
    ],
  },
  {
    elementXpath: workbenchXPath.sidebarContainer,
    title: "Workflow Completion",
    description: () => (
      <p>
        Emits <code>workflow.completed</code> event with comprehensive summary
        including brand, product, camera settings, lighting, file counts, and
        workflow status for tracking and notifications.
        <br />
        <br />
        The completion event provides a full summary of the UGC generation
        results, including all brand and product details, variant configurations
        (camera angles, lighting styles), number of files successfully uploaded,
        and final workflow status. This enables downstream systems to track
        completion, trigger notifications, update dashboards, or initiate
        follow-up workflows.
      </p>
    ),
    before: [
      {
        type: "click",
        selector: workbenchXPath.flows.feature("completion-event"),
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
          imageUrl: "https://ik.imagekit.io/5adb4yvnz/sauce_UHVrd53SR.jpg",
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
