import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal, Input, Button } from "../../components/ui";
import useModal from "../../components/ui/Modal/context/useModal";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { useCreateTicketMutation } from "./hooks/useTicketsQuery";
import { ticketPriorityLabels } from "../../utils/enumLabels";

const priorityOptions = Object.entries(ticketPriorityLabels);

function TicketForm() {
  const { setOpen } = useModal();
  const { toast } = useToast();
  const createTicket = useCreateTicketMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (title.trim().length < 3) next.title = "عنوان باید حداقل ۳ کاراکتر باشد";
    if (description.trim().length < 3) next.description = "توضیحات باید حداقل ۳ کاراکتر باشد";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        priority,
      });
      toast.Success("تیکت جدید با موفقیت ثبت شد");
      setOpen(false);
    } catch (error) {
      toast.Error(error?.message || "ثبت تیکت با خطا مواجه شد");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Modal.Content.Body className="w-full items-stretch gap-4">
        <Input
          label="عنوان تیکت"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />
        <Input
          label="توضیحات"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />
        <div className="flex flex-col gap-1.5 text-start">
          <label className="text-sm font-medium text-textSecondary">اولویت</label>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPriority(value)}
                className={`rounded-Button px-3 py-1.5 text-sm transition-colors ${
                  priority === value
                    ? "bg-primary text-white"
                    : "bg-SurfaceMuted text-textSecondary hover:bg-Border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Modal.Content.Body>
      <Modal.Content.Footer className="justify-end gap-2 px-4 pb-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
          انصراف
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={createTicket.isPending}>
          ثبت تیکت
        </Button>
      </Modal.Content.Footer>
    </form>
  );
}

function CreateTicketModal() {
  return (
    <Modal>
      <Modal.Trigger className="inline-flex items-center gap-2 rounded-Button bg-gradient-brand px-4 py-2.5 text-sm font-bold text-white shadow-Glow transition-smooth hover:brightness-110">
        <Plus size={16} />
        تیکت جدید
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Content.Header>ثبت تیکت جدید</Modal.Content.Header>
        <TicketForm />
      </Modal.Content>
    </Modal>
  );
}

export default CreateTicketModal;
