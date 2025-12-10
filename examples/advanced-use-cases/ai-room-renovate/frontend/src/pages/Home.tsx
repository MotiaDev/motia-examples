import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Home as HomeIcon, DollarSign, Clock, Palette, Zap, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Analysis',
      description: 'Advanced AI analyzes your space and creates personalized renovation plans',
    },
    {
      icon: Palette,
      title: 'Custom Design Plans',
      description: 'Get detailed design recommendations with materials, colors, and features',
    },
    {
      icon: DollarSign,
      title: 'Budget-Aware Planning',
      description: 'Tailored recommendations that fit your budget with detailed cost breakdowns',
    },
    {
      icon: Clock,
      title: 'Complete Timeline',
      description: 'Realistic project timelines with milestones and contractor schedules',
    },
    {
      icon: ImageIcon,
      title: 'Photorealistic Renderings',
      description: 'AI-generated images showing your renovated space before you start',
    },
    {
      icon: Zap,
      title: 'Iterative Refinement',
      description: 'Edit and refine renderings with simple natural language instructions',
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            Powered by AI
          </Badge>
          
          <h1 className="heading-xl text-foreground">
            Transform Your Space with{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AI-Powered
            </span>{' '}
            Renovation Planning
          </h1>
          
          <p className="body-lg text-muted-foreground max-w-2xl mx-auto">
            Get professional renovation plans, budget breakdowns, and photorealistic renderings 
            in minutes. No contractors needed to start planning your dream space.
          </p>
          
          <div className="flex justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate('/plan')}
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              Start Planning Now
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg mb-4">Everything You Need to Plan Your Renovation</h2>
            <p className="body-lg text-muted-foreground">
              Comprehensive tools powered by advanced AI technology
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="heading-sm">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="body-md">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="heading-lg">Ready to Transform Your Space?</h2>
          <p className="body-lg text-muted-foreground">
            Start your renovation journey today with AI-powered planning
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/plan')}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  );
}