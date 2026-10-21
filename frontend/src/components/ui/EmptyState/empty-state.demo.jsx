import { PackageX, SearchX, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function EmptyStateDemo() {
  return (
    <div className="flex flex-col gap-8">
      {/* no data yet */}
      <EmptyState
        icon={PackageX}
        title="No products"
        description="Get started by adding your first product to the catalog."
        action={
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Add product
          </button>
        }
      />

      {/* no search results */}
      <EmptyState
        icon={SearchX}
        title="No results found"
        description="Try adjusting your search or filters."
      />

      {/* minimal, no icon/action */}
      <EmptyState icon={Inbox} title="Inbox is empty" />
    </div>
  );
}

/**
 * Drop-in for Table.Empty (its `message` prop accepts any node):
 *
 * <Table.Body
 *   data={products}
 *   empty={
 *     <Table.Empty
 *       colSpan={3}
 *       message={
 *         <EmptyState
 *           icon={PackageX}
 *           title="No products"
 *           description="Try adding a product or clearing your filters."
 *         />
 *       }
 *     />
 *   }
 * >
 */
