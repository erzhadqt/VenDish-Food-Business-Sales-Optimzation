import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

const ReviewReplyDialog = ({
  open,
  onOpenChange,
  replyTarget,
  replyText,
  onReplyTextChange,
  replyError,
  isSubmitting,
  onCancel,
  onSubmit,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          onCancel();
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg z-50">
        <DialogHeader>
          <DialogTitle>
            {replyTarget?.admin_reply ? 'Edit Admin Reply' : 'Reply to Review'}
          </DialogTitle>
          <DialogDescription>
            Responding to {replyTarget?.customer_name || replyTarget?.food_name || 'this review'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="admin-reply-input ">
            Your reply
          </label>
          <textarea
            id="admin-reply-input"
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder="Write your response to the customer..."
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={255}
          />
          {replyError && <p className="text-sm text-red-600">{replyError}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save Reply'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewReplyDialog;
