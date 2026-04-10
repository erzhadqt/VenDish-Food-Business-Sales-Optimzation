// src/Components/DeleteConfirmDialog.jsx
import { Button } from "../Components/ui/button";
import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../Components/ui/alert-dialog";

export default function DeleteConfirmDialog({ onConfirm, title, description, children }) {
  return (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            {/* FIX: Use 'children' if provided, otherwise fallback to the Trash icon */}
            {children ? (
                children
            ) : (
                <div className="flex items-center">
                    <button className="ml-2 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                        <Trash2Icon className="text-red-600 h-6 w-6" />
                    </button>
                </div>
            )}
        </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-lg z-50">
        <AlertDialogHeader className="gap-3">
          <AlertDialogTitle className="text-xl">{title || "Confirm Deletion"}</AlertDialogTitle>
          <AlertDialogDescription className="text-base text-gray-600">
            {description || "Are you sure you want to delete this item? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 gap-3 sm:gap-0">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="text-base h-11 px-5">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onConfirm} className="text-base h-11 px-5">
              Delete
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}