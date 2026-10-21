import { useState } from "react";
import { Save, User as UserIcon } from "lucide-react";
import { Input, Button, Avatar, Badge } from "../../components/ui";
import { useAuth } from "../../auth/useAuth";
import useToast from "../../components/ui/Toast/ToastContext/useToast";
import { updateMyProfile } from "../../services/api/usersApi";
import { AVATAR_COLORS, generateAvatarDataUri } from "../../utils/generateAvatar";
import { roleLabels } from "../../utils/enumLabels";

function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const isDirty = name.trim() !== user.name || avatarUrl !== user.avatarUrl;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError("نام باید حداقل ۲ کاراکتر باشد");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const payload = {};
      if (name.trim() !== user.name) payload.name = name.trim();
      if (avatarUrl !== user.avatarUrl) payload.avatarUrl = avatarUrl;

      const updated = await updateMyProfile(payload);
      updateProfile(updated);
      toast.Success("پروفایل با موفقیت به‌روزرسانی شد");
    } catch (err) {
      toast.Error(err?.message || "به‌روزرسانی پروفایل با خطا مواجه شد");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-bold text-textPrimary">پروفایل من</h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-Border bg-Surface p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar name={name || user.name} src={avatarUrl} size="lg" />
          <div>
            <p className="font-Outfit text-lg font-bold text-textPrimary">{user.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="brand">{roleLabels[user.role] || user.role}</Badge>
              <span className="text-xs text-textMuted">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-start">
          <label className="text-sm font-medium text-textSecondary">انتخاب آواتار</label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((color) => {
              const dataUri = generateAvatarDataUri(name || user.name, color.value);
              const isSelected = avatarUrl === dataUri;
              return (
                <button
                  key={color.value}
                  type="button"
                  title={color.name}
                  onClick={() => setAvatarUrl(dataUri)}
                  className={`flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-Surface transition-all hover:scale-110 ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isSelected && <span className="size-2 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="نام"
          required
          icon={<UserIcon size={18} />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />

        <Input label="ایمیل" value={user.email} disabled helperText="ایمیل قابل تغییر نیست" />

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isSaving} disabled={!isDirty}>
            <Save size={16} />
            ذخیره تغییرات
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
