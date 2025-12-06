import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  titleId: string | null;
  descriptionId: string | null;
  setTitleId: (id: string | null) => void;
  setDescriptionId: (id: string | null) => void;
}>({
  titleId: null,
  descriptionId: null,
  setTitleId: () => {},
  setDescriptionId: () => {},
});

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);
  const [titleId, setTitleId] = React.useState<string | null>(null);
  const [descriptionId, setDescriptionId] = React.useState<string | null>(null);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute('disabled') && !el.hasAttribute('aria-hidden')
    );
  };

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      
      setTimeout(() => {
        if (contentRef.current) {
          const focusableElements = getFocusableElements(contentRef.current);
          const firstFocusable = focusableElements[0];
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, 0);
    } else {
      document.body.style.overflow = 'unset';
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
        return;
      }

      if (e.key === 'Tab' && contentRef.current) {
        const focusableElements = getFocusableElements(contentRef.current);
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ titleId, descriptionId, setTitleId, setDescriptionId }}>
      <div
        ref={dialogRef}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={() => onOpenChange(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId || undefined}
        aria-describedby={descriptionId || undefined}
      >
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
          aria-hidden="true"
        />
        <div ref={contentRef} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-lg border p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
    {...props}
  />
));
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, id, ...props }, ref) => {
  const { setTitleId } = React.useContext(DialogContext);
  const titleId = id || React.useId();
  
  React.useEffect(() => {
    setTitleId(titleId);
    return () => setTitleId(null);
  }, [titleId, setTitleId]);
  
  return (
    <h2
      ref={ref}
      id={titleId}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
});
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, id, ...props }, ref) => {
  const { setDescriptionId } = React.useContext(DialogContext);
  const descriptionId = id || React.useId();
  
  React.useEffect(() => {
    setDescriptionId(descriptionId);
    return () => setDescriptionId(null);
  }, [descriptionId, setDescriptionId]);
  
  return (
    <p
      ref={ref}
      id={descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, onClose, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClose}
      className={cn(
        "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
);
DialogClose.displayName = "DialogClose";

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose };

