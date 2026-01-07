import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface NotificationPermissionDialogProps {
  open: boolean;
  onResponse: (accepted: boolean) => void;
  medicationName?: string;
}

export const NotificationPermissionDialog = ({ open, onResponse, medicationName }: NotificationPermissionDialogProps) => {
  const notificationText = medicationName 
    ? `Time for your ${medicationName} dose`
    : 'Time for your morning dose';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          {/* Mock notification preview with animation */}
          <div 
            className="mb-4 bg-muted/50 rounded-2xl p-4"
            style={{ 
              animation: open ? 'notification-dialog-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none'
            }}
          >
            <style>{`
              @keyframes notification-dialog-pop {
                0% {
                  opacity: 0;
                  transform: scale(0.9) translateY(10px);
                }
                60% {
                  transform: scale(1.02) translateY(-2px);
                }
                80% {
                  transform: scale(1) translateY(0) rotate(0deg);
                }
                85% {
                  transform: rotate(-1deg);
                }
                90% {
                  transform: rotate(1deg);
                }
                95% {
                  transform: rotate(-0.5deg);
                }
                100% {
                  opacity: 1;
                  transform: rotate(0deg);
                }
              }
            `}</style>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">Regimen</p>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {notificationText}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">now</p>
              </div>
            </div>
          </div>
          <AlertDialogTitle className="text-center">Get Reminders for Your Doses</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            We'll send you timely notifications so you never miss a dose. You can change this later in settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onResponse(false)}
            className="w-full sm:w-auto"
          >
            Not Now
          </Button>
          <Button
            onClick={() => onResponse(true)}
            className="w-full sm:w-auto"
          >
            Enable Notifications
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
