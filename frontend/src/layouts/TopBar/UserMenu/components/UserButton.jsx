import { ChevronDown, ShieldCheck } from "lucide-react";
import { Avatar } from "../../../../components/ui";

function UserButton({ user }) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-xl
        px-3
        py-2
        cursor-pointer
        transition-all
        duration-300
        hover:bg-primary/10
        hover:shadow-lg
        group
      "
    >
      <div className="relative">
        <Avatar src={user.avatar} name={user.name} size="sm" />

        {/* Online Badge */}
        <span
          className="
            absolute
            bottom-0
            right-0

            size-3.5
            rounded-full

            bg-emerald-500
            border-2
            border-white

            shadow
          "
        />
      </div>

      {/* User Info */}
      <div className="hidden xl:flex flex-col items-start leading-tight">
        <span
          className="
            text-sm
            font-bold
            text-textPrimary
          "
        >
          {user.name}
        </span>

        <span
          className="
            mt-1
            flex
            items-center
            gap-1

            text-xs
            text-textSecondary
          "
        >
          <ShieldCheck size={13} />
          {user.role}
        </span>
      </div>

      {/* Chevron */}
      <ChevronDown
        size={18}
        className="
          text-textSecondary

          transition-transform
          duration-300

          group-hover:text-primary
        "
      />
    </div>
  );
}

export default UserButton;
