import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Edit3, 
  Loader2, 
  CheckCircle2,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { renovationApi } from '@/services/renovationApi';
import { useRenovationStore } from '@/stores/renovationStore';
import type { RenderingResponse } from '@/types/renovation';

export default function RenderingViewer() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { setRenderingResult, setIsLoadingRendering, renovationResult } = useRenovationStore();
  const [rendering, setRendering] = useState<RenderingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const loadRendering = async () => {
      try {
        setIsLoadingRendering(true);
        setLoadingStage(1);
        
        const data = await renovationApi.pollForRendering(sessionId);
        setRendering(data);
        setRenderingResult(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load rendering:', error);
        setIsLoading(false);
      } finally {
        setIsLoadingRendering(false);
      }
    };

    loadRendering();

    // Simulate loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 3000);

    return () => clearInterval(stageInterval);
  }, [sessionId, navigate, setRenderingResult, setIsLoadingRendering]);

  const handleEdit = async () => {
    if (!editPrompt.trim() || !sessionId) return;

    try {
      setIsEditing(true);
      await renovationApi.editRendering(sessionId, { editPrompt });
      setEditPrompt('');
      
      // Auto-polling will pick up the new version
    } catch (error) {
      console.error('Failed to edit rendering:', error);
      setIsEditing(false);
    }
  };

  // Auto-refresh polling effect
  useEffect(() => {
    if (!sessionId || !rendering?.renderingCompleted) return;

    const pollInterval = setInterval(async () => {
      try {
        const data = await renovationApi.getRendering(sessionId);
        
        // Check if there's a new version
        const currentVersion = rendering?.rendering?.version || 1;
        const newVersion = data?.rendering?.version || 1;
        
        if (newVersion > currentVersion) {
          console.log('New rendering version detected, updating...');
          setRendering(data);
          setRenderingResult(data);
          setIsEditing(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(pollInterval);
  }, [sessionId, rendering?.renderingCompleted, rendering?.rendering?.version, setRenderingResult]);

  const handleDownload = () => {
    if (!rendering?.rendering?.imageBase64) return;

    const link = document.createElement('a');
    link.href = `data:${rendering.rendering.mimeType};base64,${rendering.rendering.imageBase64}`;
    link.download = `renovation-${sessionId}.png`;
    link.click();
  };

  // Get dynamic edit suggestions based on room type
  const getEditSuggestions = () => {
    const roomType = renovationResult?.roadmap?.roomType?.toLowerCase() || '';
    
    if (roomType.includes('kitchen')) {
      return [
        'Make the cabinets cream color',
        'Add pendant lights over the island',
        'Change flooring to darker oak',
        'Update backsplash to herringbone pattern',
      ];
    } else if (roomType.includes('bedroom')) {
      return [
        'Change the wall color to light blue',
        'Add a modern chandelier',
        'Update carpet to hardwood flooring',
        'Make the built-in shelves darker wood',
      ];
    } else if (roomType.includes('bathroom')) {
      return [
        'Change tiles to marble pattern',
        'Add gold fixtures',
        'Update vanity to floating style',
        'Make the shower glass frameless',
      ];
    } else if (roomType.includes('living')) {
      return [
        'Change sofa color to navy blue',
        'Add recessed lighting',
        'Update flooring to light oak',
        'Make the accent wall darker',
      ];
    }
    
    // Default generic suggestions
    return [
      'Change the wall color',
      'Update the flooring',
      'Add more lighting',
      'Modify the furniture style',
    ];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <CardTitle className="heading-md text-center">Generating Your Rendering</CardTitle>
            <CardDescription className="text-center">
              AI is creating a photorealistic visualization of your renovated space
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadingStage >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {loadingStage > 1 ? <CheckCircle2 className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Processing Design Plan</p>
                  <p className="text-sm text-muted-foreground">Converting plan to visual prompt</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadingStage >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {loadingStage > 2 ? <CheckCircle2 className="w-5 h-5" /> : loadingStage === 2 ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Generating Image</p>
                  <p className="text-sm text-muted-foreground">AI creating photorealistic rendering</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadingStage >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {loadingStage >= 3 ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Finalizing Rendering</p>
                  <p className="text-sm text-muted-foreground">Preparing your visualization</p>
                </div>
              </div>
            </div>

            <Progress value={loadingStage * 33.33} className="h-2" />
            
            <div className="text-center text-sm text-muted-foreground">
              This may take 10-15 seconds...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rendering?.rendering) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Rendering Not Available</CardTitle>
            <CardDescription>
              {rendering?.renderingError || 'The rendering for this session is not available yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate(`/dashboard/${sessionId}`)} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/${sessionId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Rendering */}
          <div className="lg:col-span-2">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="heading-md">Your Renovated Space</CardTitle>
                    <CardDescription>
                      AI-generated photorealistic rendering
                    </CardDescription>
                  </div>
                  <Badge className="bg-accent text-accent-foreground">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <img
                    src={`data:${rendering.rendering.mimeType};base64,${rendering.rendering.imageBase64}`}
                    alt="Renovation rendering"
                    className="w-full h-auto"
                  />
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Model: {rendering.rendering.model}</p>
                  <p>Generated: {new Date(rendering.rendering.generatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="heading-sm flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Refine Rendering
                </CardTitle>
                <CardDescription>
                  Use natural language to edit the rendering
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="edit-prompt" className="sr-only">
                    Edit Instructions
                  </label>
                  <Input
                    id="edit-prompt"
                    placeholder="Make the cabinets cream instead of white..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isEditing) {
                        handleEdit();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleEdit} 
                    disabled={!editPrompt.trim() || isEditing}
                    className="w-full"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Editing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Apply Edit
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Quick Edits:</p>
                  {getEditSuggestions().map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => setEditPrompt(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="heading-sm">Rendering Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {rendering.rendering.prompt}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}