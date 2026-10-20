import { Pencil } from "lucide-react";
import { Popover, Avatar } from "../../components/ui";
import usePopover from "../../components/ui/Popover/context/usePopover";
import { AVATAR_COLORS, generateAvatarDataUri } from "../../utils/generateAvatar";

function ColorSwatchGrid({ userName, currentAvatarUrl, onSelect, isPending }) {
  const { setOpen } = usePopover();

  const handlePick = (color) => {
    const dataUri = generateAvatarDataUri(userName, color);
    onSelect(dataUri);
    setOpen(false);
  };

  return (
    <div className="w-56 text-start">
      <p className="mb-2 text-xs font-medium text-textSecondary">انتخاب آواتار برای {userName}</p>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_COLORS.map((color) => {
          const dataUri = generateAvatarDataUri(userName, color.value);
          const isSelected = currentAvatarUrl === dataUri;
          return (
            <button
              key={color.value}
              type="button"
              title={color.name}
              disabled={isPending}
              onClick={() => handlePick(color.value)}
              className={`flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-Surface transition-all hover:scale-110 disabled:opacity-50 ${
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
  );
}

function AvatarPicker({ user, onSelect, isPending }) {
  return (
    <Popover>
      <Popover.Container>
        <Popover.Trigger
          asChild
          className="group relative inline-flex cursor-pointer items-center justify-center rounded-full"
        >
          <span className="relative inline-flex">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <span className="absolute -bottom-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              <Pencil size={9} />
            </span>
          </span>
        </Popover.Trigger>
        <Popover.Content side="bottom" className="p-3">
          <ColorSwatchGrid
            userName={user.name}
            currentAvatarUrl={user.avatarUrl}
            onSelect={onSelect}
            isPending={isPending}
          />
        </Popover.Content>
      </Popover.Container>
    </Popover>
  );
}

export default AvatarPicker;
