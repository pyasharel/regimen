import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface NotificationPermissionDialogProps {
  open: boolean;
  onResponse: (accepted: boolean) => void;
}

export const NotificationPermissionDialog = ({ open, onResponse }: NotificationPermissionDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Bell className="h-8 w-8 text-primary" />
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
