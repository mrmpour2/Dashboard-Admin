import { Trash2, AlertTriangle } from "lucide-react";
import { Modal, Button } from "./ui";
import useModal from "./ui/Modal/context/useModal";

// چون useModal فقط داخل ModalProvider در دسترس است، این زیرکامپوننت داخلی
// می‌تواند بعد از موفقیت حذف، خودش Modal را ببندد.
function ConfirmBody({ itemLabel, onConfirm, isPending }) {
  const { setOpen } = useModal();

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  return (
    <>
      <Modal.Content.Body>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-Danger/10 text-Danger">
          <AlertTriangle size={22} />
        </span>
        <p className="mt-3 font-medium text-textPrimary">
          حذف {itemLabel} انجام شود؟
        </p>
        <p className="mt-1 text-sm text-textMuted">
          این عملیات غیرقابل بازگشت است.
        </p>
      </Modal.Content.Body>
      <Modal.Content.Footer className="justify-end gap-2 px-4 pb-4">
        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button variant="danger" size="sm" onClick={handleConfirm} loading={isPending}>
          <Trash2 size={14} className="me-1" />
          حذف
        </Button>
      </Modal.Content.Footer>
    </>
  );
}

function DeleteConfirmButton({ itemLabel, onConfirm, isPending, ariaLabel }) {
  return (
    <Modal>
      <Modal.Trigger
        aria-label={ariaLabel || `حذف ${itemLabel}`}
        className="flex size-8 items-center justify-center rounded-lg text-Danger transition-colors hover:bg-Danger/10"
      >
        <Trash2 size={16} />
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Content.Header>حذف تأیید می‌شود؟</Modal.Content.Header>
        <ConfirmBody itemLabel={itemLabel} onConfirm={onConfirm} isPending={isPending} />
      </Modal.Content>
    </Modal>
  );
}

export default DeleteConfirmButton;
