import useModal from "../context/useModal";

function ModalOverlay() {
  const { setOpen } = useModal();
  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto"
    ></div>
  );
}

export default ModalOverlay;
