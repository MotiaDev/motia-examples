/**
 * Ad Generator Panel
 *
 * Workbench plugin component for generating AI-powered ads from landing page URLs.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Badge, Button } from "@motiadev/ui";
import {
  Sparkles,
  Image,
  Video,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Clock,
  Zap,
  Instagram,
  Globe,
} from "lucide-react";

const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

interface JobState {
  jobId: string;
  url: string;
  type: string[];
  output: string;
  status: string;
  brandAnalysis?: {
    brandName: string;
    tagline: string;
    tone: string;
    visualStyle: string;
  };
  generatedImage?: {
    imagePath: string;
    adFormat: string;
  };
  generatedVideo?: {
    videoPath: string;
    provider: string;
    duration: number;
  };
  error?: string;
  scrapedAt?: string;
  filteredAt?: string;
  analyzedAt?: string;
  imageCompletedAt?: string;
  videoCompletedAt?: string;
}

type TabType = "generate" | "jobs" | "results";

export const AdGeneratorPanel = () => {
  const [activeTab, setActiveTab] = useState<TabType>("generate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [url, setUrl] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [videoProvider, setVideoProvider] = useState<"kling" | "veo" | "auto">(
    "auto"
  );

  // Jobs state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobState | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Poll job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/job-status/${jobId}`);
        if (response.ok) {
          const data = await response.json();
          setJobStatus(data);

          // Stop polling if job is complete or failed
          if (
            data.status?.includes("completed") ||
            data.status?.includes("failed")
          ) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }
          }
        }
      } catch (err) {
        console.error("Error polling job status:", err);
      }
    },
    [pollingInterval]
  );

  // Generate ad
  const handleGenerateAd = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    setJobStatus(null);

    try {
      const response = await fetch("/api/generate-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          type: platforms,
          videoProvider,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Ad generation started! Job ID: ${data.jobId}`);
        setCurrentJobId(data.jobId);
        setActiveTab("jobs");

        // Start polling for status
        const interval = setInterval(() => {
          pollJobStatus(data.jobId);
        }, 3000);
        setPollingInterval(interval);

        // Initial poll
        pollJobStatus(data.jobId);
      } else {
        setError(data.error || "Failed to start ad generation");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start ad generation");
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform);
      }
      return [...prev, platform];
    });
  };

  const getStatusColor = (status: string) => {
    if (status?.includes("completed")) return "text-green-500";
    if (status?.includes("failed")) return "text-red-500";
    if (status?.includes("generating") || status?.includes("analyzing"))
      return "text-blue-500";
    return "text-yellow-500";
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status?.includes("completed")) return "default";
    if (status?.includes("failed")) return "destructive";
    return "outline";
  };

  const tabs = [
    { id: "generate" as TabType, label: "Generate", icon: Sparkles },
    { id: "jobs" as TabType, label: "Current Job", icon: Clock },
    { id: "results" as TabType, label: "Results", icon: Image },
  ];

  return (
    <div className="flex overflow-hidden flex-col h-full bg-background">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-zinc-900">
        <div className="flex gap-3 items-center">
          <Sparkles className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">AI Ad Generator</h1>
          <Badge variant="default">Powered by Gemini</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-zinc-900">
        <div className="flex px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-500"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto flex-1">
        <div className="p-6 mx-auto space-y-6 max-w-4xl">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-500 dark:bg-red-950">
              <div className="flex gap-2 items-center text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-500 dark:bg-green-950">
              <div className="flex gap-2 items-center text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === "generate" && (
            <div className="space-y-6">
              <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                <h2 className="flex gap-2 items-center mb-6 text-xl font-semibold">
                  <Globe className="w-5 h-5" />
                  Generate Ads from Landing Page
                </h2>

                {/* URL Input */}
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium">
                    Landing Page URL *
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/product"
                    className="px-4 py-3 w-full text-lg rounded-lg border bg-background"
                  />
                  <p className="mt-2 text-sm text-zinc-400">
                    Enter the URL of the product or brand landing page
                  </p>
                </div>

                {/* Platform Selection */}
                <div className="mb-6">
                  <label className="block mb-3 text-sm font-medium">
                    Target Platforms *
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => togglePlatform("instagram")}
                      className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-lg border-2 transition-all",
                        platforms.includes("instagram")
                          ? "border-pink-500 bg-pink-500/10"
                          : "border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <Instagram
                        className={cn(
                          "w-6 h-6",
                          platforms.includes("instagram")
                            ? "text-pink-500"
                            : "text-zinc-400"
                        )}
                      />
                      <div className="text-left">
                        <p className="font-semibold">Instagram</p>
                        <p className="text-xs text-zinc-400">1:1 Image Ads</p>
                      </div>
                      {platforms.includes("instagram") && (
                        <CheckCircle2 className="ml-2 w-5 h-5 text-pink-500" />
                      )}
                    </button>

                    <button
                      onClick={() => togglePlatform("tiktok")}
                      className={cn(
                        "flex items-center gap-3 px-6 py-4 rounded-lg border-2 transition-all",
                        platforms.includes("tiktok")
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-zinc-700 hover:border-zinc-600"
                      )}
                    >
                      <Video
                        className={cn(
                          "w-6 h-6",
                          platforms.includes("tiktok")
                            ? "text-cyan-500"
                            : "text-zinc-400"
                        )}
                      />
                      <div className="text-left">
                        <p className="font-semibold">TikTok</p>
                        <p className="text-xs text-zinc-400">9:16 Video Ads</p>
                      </div>
                      {platforms.includes("tiktok") && (
                        <CheckCircle2 className="ml-2 w-5 h-5 text-cyan-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Video Provider (only show if TikTok selected) */}
                {platforms.includes("tiktok") && (
                  <div className="mb-6">
                    <label className="block mb-3 text-sm font-medium">
                      Video Provider
                    </label>
                    <div className="flex gap-3">
                      {(["auto", "kling", "veo"] as const).map((provider) => (
                        <button
                          key={provider}
                          onClick={() => setVideoProvider(provider)}
                          className={cn(
                            "px-4 py-2 rounded-lg border transition-all capitalize",
                            videoProvider === provider
                              ? "border-purple-500 bg-purple-500/10 text-purple-400"
                              : "border-zinc-700 hover:border-zinc-600"
                          )}
                        >
                          {provider === "auto" ? "Auto Select" : provider}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateAd}
                  disabled={loading || !url.trim() || platforms.length === 0}
                  className="w-full py-6 text-lg"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      Starting Generation...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 w-5 h-5" />
                      Generate AI Ads
                    </>
                  )}
                </Button>
              </div>

              {/* Info Card */}
              <div className="p-6 rounded-lg border bg-zinc-900/50 border-zinc-800">
                <h3 className="mb-3 font-semibold">How it works:</h3>
                <ol className="space-y-2 text-sm text-zinc-400">
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-500">1.</span>
                    Scrapes your landing page for images, branding, and content
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-500">2.</span>
                    AI filters and selects the best product images
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-500">3.</span>
                    Analyzes brand identity (colors, tone, style)
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-purple-500">4.</span>
                    Generates scroll-stopping ad images and videos
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div className="space-y-6">
              {currentJobId && jobStatus ? (
                <div className="p-6 rounded-lg border shadow-lg bg-zinc-900 border-zinc-800">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Job Progress</h2>
                      <p className="mt-1 font-mono text-sm text-zinc-400">
                        {currentJobId}
                      </p>
                    </div>
                    <Badge
                      variant={getStatusBadgeVariant(jobStatus.status || "")}
                    >
                      {jobStatus.status || "Unknown"}
                    </Badge>
                  </div>

                  {/* URL */}
                  <div className="mb-4">
                    <p className="text-sm text-zinc-400">Source URL</p>
                    <a
                      href={jobStatus.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-1 items-center text-blue-400 hover:underline"
                    >
                      {jobStatus.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Progress Steps */}
                  <div className="space-y-3">
                    <div className="flex gap-3 items-center">
                      {jobStatus.scrapedAt ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      )}
                      <span>Scraping landing page</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      {jobStatus.filteredAt ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : jobStatus.scrapedAt ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-zinc-500" />
                      )}
                      <span>Filtering product images</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      {jobStatus.analyzedAt ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : jobStatus.filteredAt ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-zinc-500" />
                      )}
                      <span>Analyzing brand identity</span>
                    </div>
                    {jobStatus.type?.includes("instagram") && (
                      <div className="flex gap-3 items-center">
                        {jobStatus.imageCompletedAt ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : jobStatus.analyzedAt ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-zinc-500" />
                        )}
                        <span>Generating image ad</span>
                      </div>
                    )}
                    {jobStatus.type?.includes("tiktok") && (
                      <div className="flex gap-3 items-center">
                        {jobStatus.videoCompletedAt ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : jobStatus.analyzedAt ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-zinc-500" />
                        )}
                        <span>Generating video ad</span>
                      </div>
                    )}
                  </div>

                  {/* Brand Analysis Preview */}
                  {jobStatus.brandAnalysis && (
                    <div className="p-4 mt-6 rounded-lg bg-zinc-800">
                      <h3 className="mb-2 font-semibold">Brand Analysis</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-zinc-400">Brand:</span>{" "}
                          {jobStatus.brandAnalysis.brandName}
                        </div>
                        <div>
                          <span className="text-zinc-400">Tone:</span>{" "}
                          {jobStatus.brandAnalysis.tone}
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-400">Tagline:</span>{" "}
                          {jobStatus.brandAnalysis.tagline}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {jobStatus.error && (
                    <div className="p-4 mt-6 bg-red-950 rounded-lg border border-red-500">
                      <p className="text-red-300">{jobStatus.error}</p>
                    </div>
                  )}

                  {/* Refresh Button */}
                  <Button
                    variant="outline"
                    onClick={() => pollJobStatus(currentJobId)}
                    className="mt-6"
                  >
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Refresh Status
                  </Button>
                </div>
              ) : (
                <div className="p-12 text-center rounded-lg border bg-zinc-900 border-zinc-800">
                  <Clock className="mx-auto mb-4 w-12 h-12 text-zinc-500" />
                  <p className="text-zinc-400">
                    No active job. Start by generating an ad!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("generate")}
                    className="mt-4"
                  >
                    Go to Generate
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === "results" && (
            <div className="space-y-6">
              {jobStatus?.generatedImage || jobStatus?.generatedVideo ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Image Result */}
                  {jobStatus.generatedImage && (
                    <div className="p-6 rounded-lg border bg-zinc-900 border-zinc-800">
                      <h3 className="flex gap-2 items-center mb-4 font-semibold">
                        <Image className="w-5 h-5 text-pink-500" />
                        Instagram Ad
                      </h3>
                      <div className="overflow-hidden rounded-lg aspect-square bg-zinc-800">
                        <img
                          src={`/outputs/${jobStatus.generatedImage.imagePath
                            .split("/")
                            .pop()}`}
                          alt="Generated Ad"
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        Format: {jobStatus.generatedImage.adFormat}
                      </p>
                    </div>
                  )}

                  {/* Video Result */}
                  {jobStatus.generatedVideo && (
                    <div className="p-6 rounded-lg border bg-zinc-900 border-zinc-800">
                      <h3 className="flex gap-2 items-center mb-4 font-semibold">
                        <Video className="w-5 h-5 text-cyan-500" />
                        TikTok Video
                      </h3>
                      <div className="overflow-hidden rounded-lg bg-zinc-800 aspect-[9/16]">
                        <video
                          src={jobStatus.generatedVideo.videoPath}
                          controls
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        Provider: {jobStatus.generatedVideo.provider} •
                        Duration: {jobStatus.generatedVideo.duration}s
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center rounded-lg border bg-zinc-900 border-zinc-800">
                  <Image className="mx-auto mb-4 w-12 h-12 text-zinc-500" />
                  <p className="text-zinc-400">
                    No results yet. Generate an ad to see results here!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("generate")}
                    className="mt-4"
                  >
                    Go to Generate
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
