import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Palette, 
  Users, 
  ListChecks,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { renovationApi } from '@/services/renovationApi';
import { useRenovationStore } from '@/stores/renovationStore';
import type { RenovationResult } from '@/types/renovation';
import { BudgetChart } from '@/components/renovation/BudgetChart';

export default function Dashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { setRenovationResult, setIsLoadingResult } = useRenovationStore();
  const [result, setResult] = useState<RenovationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const loadResult = async () => {
      try {
        setIsLoadingResult(true);
        setLoadingStage(1);
        
        const data = await renovationApi.pollForResult(sessionId);
        setResult(data);
        setRenovationResult(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load renovation result:', error);
        setIsLoading(false);
      } finally {
        setIsLoadingResult(false);
      }
    };

    loadResult();

    // Simulate loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage((prev) => (prev < 4 ? prev + 1 : prev));
    }, 2000);

    return () => clearInterval(stageInterval);
  }, [sessionId, navigate, setRenovationResult, setIsLoadingResult]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <CardTitle className="heading-md text-center">Creating Your Renovation Plan</CardTitle>
            <CardDescription className="text-center">
              Our AI is analyzing your requirements and generating a comprehensive plan
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
                  <p className="font-medium">Analyzing Requirements</p>
                  <p className="text-sm text-muted-foreground">Understanding your space and needs</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadingStage >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {loadingStage > 2 ? <CheckCircle2 className="w-5 h-5" /> : loadingStage === 2 ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Creating Design Plan</p>
                  <p className="text-sm text-muted-foreground">Selecting materials and colors</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadingStage >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {loadingStage > 3 ? <CheckCircle2 className="w-5 h-5" /> : loadingStage === 3 ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Calculating Budget</p>
                  <p className="text-sm text-muted-foreground">Breaking down costs and timeline</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  loadingStage >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {loadingStage >= 4 ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Finalizing Roadmap</p>
                  <p className="text-sm text-muted-foreground">Preparing your complete plan</p>
                </div>
              </div>
            </div>

            <Progress value={loadingStage * 25} className="h-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result?.roadmap) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>No Results Found</CardTitle>
            <CardDescription>
              We couldn't find a renovation plan for this session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { roadmap, assessmentSummary } = result;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <Button onClick={() => navigate(`/rendering/${sessionId}`)}>
            <ImageIcon className="w-4 h-4 mr-2" />
            View Rendering
          </Button>
        </div>

        {/* Project Summary */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="heading-lg mb-2">Your Renovation Plan</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{roadmap.projectSummary.roomType}</Badge>
                  <Badge variant="secondary">{roadmap.projectSummary.style}</Badge>
                  <Badge variant="outline">{roadmap.projectSummary.scope} Renovation</Badge>
                  <Badge variant="outline">{roadmap.projectSummary.squareFootage} sq ft</Badge>
                </div>
              </div>
              <Badge className="bg-accent text-accent-foreground text-lg px-4 py-2">
                ${roadmap.budget.total.toLocaleString()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="action">Action Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${roadmap.budget.total.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Including {((roadmap.budget.contingency / roadmap.budget.total) * 100).toFixed(0)}% contingency
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roadmap.timeline.duration.split('(')[0].trim()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roadmap.timeline.scope} scope project
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contractors Needed</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roadmap.contractors.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Professional specialists
                  </p>
                </CardContent>
              </Card>
            </div>

            {assessmentSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="heading-sm">Assessment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Key Issues Identified:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {assessmentSummary.keyIssues.map((issue, index) => (
                        <li key={index} className="text-sm text-muted-foreground">{issue}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Opportunities:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {assessmentSummary.opportunities.map((opp, index) => (
                        <li key={index} className="text-sm text-muted-foreground">{opp}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="heading-sm flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Design Plan
                </CardTitle>
                <CardDescription>
                  Approach: {roadmap.designPlan.approach.replace(/_/g, ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Color Palette</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(roadmap.designPlan.colors).map(([key, value]) => {
                      // Convert color names to CSS colors with better matching
                      const valueLC = (value as string).toLowerCase();
                      let bgColor = '#E5E5E5'; // default gray
                      let borderColor = '#D1D5DB'; // default border
                      
                      // Check for specific compound colors first (most specific first)
                      if (valueLC.includes('glossy white') || valueLC.includes('pure white')) {
                        bgColor = '#FAFAFA';
                        borderColor = '#E5E7EB';
                      } else if (valueLC.includes('soft white') || valueLC.includes('off white')) {
                        bgColor = '#F5F5F5';
                        borderColor = '#E5E7EB';
                      } else if (valueLC.includes('cream') || valueLC.includes('ivory')) {
                        bgColor = '#FFFDD0';
                        borderColor = '#F3E5AB';
                      } else if (valueLC.includes('natural wood') || valueLC.includes('wood tone')) {
                        bgColor = '#C19A6B';
                        borderColor = '#A0826D';
                      } else if (valueLC.includes('dark wood') || valueLC.includes('walnut') || valueLC.includes('espresso')) {
                        bgColor = '#5C4033';
                        borderColor = '#3E2723';
                      } else if (valueLC.includes('oak') || valueLC.includes('maple') || valueLC.includes('light wood')) {
                        bgColor = '#D4A574';
                        borderColor = '#C19A6B';
                      } else if (valueLC.includes('beige') || valueLC.includes('tan')) {
                        bgColor = '#F5F5DC';
                        borderColor = '#DEB887';
                      } else if (valueLC.includes('gray') || valueLC.includes('grey')) {
                        if (valueLC.includes('light')) {
                          bgColor = '#D3D3D3';
                        } else if (valueLC.includes('dark')) {
                          bgColor = '#505050';
                        } else {
                          bgColor = '#808080';
                        }
                        borderColor = '#6B7280';
                      } else if (valueLC.includes('blue')) {
                        if (valueLC.includes('navy')) {
                          bgColor = '#1E3A8A';
                        } else if (valueLC.includes('light')) {
                          bgColor = '#BFDBFE';
                        } else {
                          bgColor = '#3B82F6';
                        }
                        borderColor = '#2563EB';
                      } else if (valueLC.includes('green')) {
                        bgColor = '#10B981';
                        borderColor = '#059669';
                      } else if (valueLC.includes('spa') || valueLC.includes('aqua') || valueLC.includes('teal')) {
                        bgColor = '#5EEAD4';
                        borderColor = '#2DD4BF';
                      } else if (valueLC.includes('black')) {
                        bgColor = '#1F2937';
                        borderColor = '#111827';
                      } else if (valueLC.includes('white')) {
                        bgColor = '#FFFFFF';
                        borderColor = '#E5E7EB';
                      }
                      
                      return (
                        <div key={key} className="space-y-2">
                          <div 
                            className="h-20 rounded-lg border-2 shadow-sm" 
                            style={{ 
                              backgroundColor: bgColor,
                              borderColor: borderColor
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-foreground">{value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Materials</h3>
                  <div className="grid gap-2">
                    {roadmap.designPlan.materials.map((material, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{material}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Key Features</h3>
                  <div className="grid gap-2">
                    {roadmap.designPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="heading-sm">Budget Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <BudgetChart budget={roadmap.budget} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="heading-sm">Cost Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">Materials</span>
                    <span className="text-lg font-bold">${roadmap.budget.materials.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">Labor</span>
                    <span className="text-lg font-bold">${roadmap.budget.labor.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">Permits</span>
                    <span className="text-lg font-bold">${roadmap.budget.permits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">Contingency</span>
                    <span className="text-lg font-bold">${roadmap.budget.contingency.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10">
                    <span className="font-bold text-lg">Total Budget</span>
                    <span className="text-2xl font-bold text-primary">${roadmap.budget.total.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="heading-sm flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Project Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Duration</p>
                  <p className="text-2xl font-bold">{roadmap.timeline.duration}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Required Contractors</h3>
                  <div className="grid gap-2">
                    {roadmap.contractors.map((contractor, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Users className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="font-medium">{contractor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="action" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="heading-sm flex items-center gap-2">
                  <ListChecks className="w-5 h-5" />
                  Action Checklist
                </CardTitle>
                <CardDescription>
                  Follow these steps to get your renovation started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roadmap.actionChecklist.map((action, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm flex-1 pt-1">{action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}