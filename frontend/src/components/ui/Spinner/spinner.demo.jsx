import { Spinner } from "@/components/ui/spinner";

export default function SpinnerDemo() {
  return (
    <div className="flex flex-col gap-6">
      {/* sizes */}
      <div className="flex items-center gap-4">
        <Spinner size="sm" />
        <Spinner size="default" />
        <Spinner size="lg" />
        <Spinner size="xl" />
      </div>

      {/* custom color via className (uses currentColor) */}
      <Spinner size="lg" className="text-blue-500" />

      {/* inside a disabled button, like shadcn's loading-button pattern */}
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-70"
      >
        <Spinner size="sm" className="text-current" />
        Please wait
      </button>

      {/* full-section loading state */}
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    </div>
  );
}
