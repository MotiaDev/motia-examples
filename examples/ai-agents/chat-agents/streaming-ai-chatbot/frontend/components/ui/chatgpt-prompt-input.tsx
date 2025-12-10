// component.tsx
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// --- Utility Function & Radix Primitives ---
type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string { return inputs.filter(Boolean).join(" "); }

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => ( <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)} {...props}>{props.children}{showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}</TooltipPrimitive.Content></TooltipPrimitive.Portal>));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// --- SVG Icon Components ---
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}> <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> </svg> );

// PromptBox Props Interface (simplified - no file support)
interface PromptBoxProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onSubmit'> {
  onSubmit?: (message: string) => void;
}

// --- The Final, Self-Contained PromptBox Component ---
export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ className, onSubmit, ...props }, ref) => {
    // Simplified state - no file or tools support
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = React.useState("");
    
    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
    
    React.useLayoutEffect(() => { 
      const textarea = internalTextareaRef.current; 
      if (textarea) { 
        textarea.style.height = "auto"; 
        const newHeight = Math.min(textarea.scrollHeight, 200); 
        textarea.style.height = `${newHeight}px`; 
      } 
    }, [value]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { 
      setValue(e.target.value); 
      if (props.onChange) props.onChange(e); 
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const message = value.trim();
      if (message) {
        onSubmit?.(message);
        setValue("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const formEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(formEvent);
      }
    };
    
    const hasValue = value.trim().length > 0;

    return (
      <form onSubmit={handleSubmit} className={cn("flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent cursor-text", className)}>
        <textarea 
          ref={internalTextareaRef} 
          rows={1} 
          value={value} 
          onChange={handleInputChange} 
          onKeyDown={handleKeyDown}
          placeholder="Type your message..." 
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12" 
          {...props} 
        />
        
        <div className="mt-0.5 p-1 pt-0">
          <div className="flex items-center justify-end gap-2">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="submit" disabled={!hasValue} className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 disabled:bg-black/40 dark:disabled:bg-[#515151]">
                    <SendIcon className="h-6 w-6 text-bold" />
                    <span className="sr-only">Send message</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}><p>Send</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </form>
    );
  }
);
PromptBox.displayName = "PromptBox";