import { useState } from "react";
import { LogOut, AlertTriangle } from "lucide-react";
import Modal from "../../../../components/ui/Modal/Modal";
import useModal from "../../../../components/ui/Modal/context/useModal";

function LogoutConfirmModal({ onConfirm }) {
  const { setOpen } = useModal();
  const [loading, setLoading] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (dontAskAgain) {
        localStorage.setItem("skipLogoutConfirm", "true");
      }
      await onConfirm?.();
      setOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
  };

  return (
    <Modal.Content>
      <Modal.Header>
        <div className="flex w-full flex-col items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-Danger/10 text-Danger">
            <AlertTriangle size={26} />
          </span>
          <h2 className="text-lg font-bold text-textPrimary">
            خروج از حساب کاربری
          </h2>
        </div>
      </Modal.Header>

      <Modal.Body className="text-center">
        <p className="text-sm leading-6 text-textSecondary">
          آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
          <br />
          برای استفاده مجدد باید دوباره وارد شوید.
        </p>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-textMuted transition hover:text-textSecondary">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
            disabled={loading}
            className="size-3.5 cursor-pointer accent-primary"
          />
          دیگر نپرس
        </label>
      </Modal.Body>

      <Modal.Footer className="w-full gap-3 p-4 pt-0">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          autoFocus
          className="flex-1 rounded-xl border border-Border bg-Surface px-4 py-2.5 text-sm font-medium text-textPrimary transition hover:bg-SurfaceMuted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          انصراف
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-Danger px-4 py-2.5 text-sm font-medium text-white transition hover:bg-Danger/90 focus:outline-none focus:ring-2 focus:ring-Danger/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              در حال خروج...
            </>
          ) : (
            <>
              <LogOut size={16} />
              خروج
            </>
          )}
        </button>
      </Modal.Footer>
    </Modal.Content>
  );
}

export default LogoutConfirmModal;
