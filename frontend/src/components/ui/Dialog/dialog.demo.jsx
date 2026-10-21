import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export default function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
        Delete account
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose className="rounded-md border border-Border px-4 py-2 text-sm hover:bg-SurfaceMuted">
            Cancel
          </DialogClose>
          <button className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
