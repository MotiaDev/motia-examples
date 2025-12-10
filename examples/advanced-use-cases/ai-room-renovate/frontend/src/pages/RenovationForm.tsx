import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { renovationApi } from '@/services/renovationApi';
import { useRenovationStore } from '@/stores/renovationStore';

const formSchema = z.object({
  message: z.string().min(10, 'Please provide at least 10 characters describing your renovation needs'),
  budget: z.number().min(1000, 'Budget must be at least $1,000').optional(),
});

type FormData = z.infer<typeof formSchema>;

const SAMPLE_PROMPTS = [
  'I want to renovate my 10x12 kitchen. It has oak cabinets from the 90s and laminate counters. I love modern farmhouse style.',
  'My master bathroom is tiny (5x8) with a cramped tub. I want a spa-like retreat with walk-in shower.',
  'Transform my small, dark bedroom into a cozy modern retreat. The room feels cramped and has poor lighting.',
];

export default function RenovationForm() {
  const navigate = useNavigate();
  const { setFormData, setSessionId, setIsSubmitting, setError } = useRenovationStore();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      budget: undefined,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setFormData(data);

      const response = await renovationApi.startRenovation({
        message: data.message,
        budget: data.budget,
      });

      setSessionId(response.sessionId);
      navigate(`/dashboard/${response.sessionId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit renovation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="heading-md flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Plan Your Renovation
            </CardTitle>
            <CardDescription>
              Tell us about your space and budget. AI will create a complete renovation plan with detailed design, timeline, and cost breakdown.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="message">Describe Your Renovation Project</FormLabel>
                      <FormControl>
                        <Textarea
                          id="message"
                          placeholder="I want to renovate my kitchen with modern farmhouse style..."
                          className="min-h-32 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Be specific about room type, size, current state, style preferences, and what you'd like to change
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Need inspiration? Try these examples:</p>
                  <div className="space-y-2">
                    {SAMPLE_PROMPTS.map((prompt, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        className="w-full text-left h-auto py-3 px-4 justify-start"
                        onClick={() => form.setValue('message', prompt)}
                      >
                        <span className="text-sm line-clamp-2">{prompt}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="budget">Budget (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                            $
                          </span>
                          <Input
                            id="budget"
                            type="number"
                            placeholder="25000"
                            className="pl-8 text-lg"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter your budget to get tailored recommendations and accurate cost breakdowns
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Quick budget options:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[10000, 20000, 30000, 50000].map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        className={form.watch('budget') === amount ? 'border-primary border-2' : ''}
                        onClick={() => form.setValue('budget', amount)}
                      >
                        ${amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-lg py-6"
                  disabled={form.formState.isSubmitting || !form.watch('message')}
                >
                  {form.formState.isSubmitting ? (
                    'Creating Your Plan...'
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Renovation Plan
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
