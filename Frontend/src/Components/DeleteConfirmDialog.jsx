import { Button } from "@/Components/ui/button";
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
} from "@/Components/ui/alert-dialog";

export default function DeleteConfirmDialog({ onConfirm, title, description, children }) {
  return (
    <AlertDialog>
        <AlertDialogTrigger asChild>
            <div className="flex items-center">
                <button className="ml-2">
                <Trash2Icon className="text-red-600" />
                </button>
            </div>
        </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || "Confirm Deletion"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || "Are you sure you want to delete this item? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
