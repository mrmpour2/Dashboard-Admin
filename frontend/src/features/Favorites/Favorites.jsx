import { Heart } from "lucide-react";
import { EmptyState } from "../../components/ui";

function Favorites() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <EmptyState
        icon={Heart}
        title="علاقه‌مندی‌ها به‌زودی راه‌اندازی می‌شود"
        description="محصولات، تیکت‌ها و آیتم‌های مورد علاقه‌ی شما به‌زودی در همین‌جا نمایش داده می‌شوند."
      />
    </div>
  );
}

export default Favorites;
