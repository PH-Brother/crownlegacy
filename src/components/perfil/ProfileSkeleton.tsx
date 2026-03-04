import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Gamification */}
      <Skeleton className="h-8 w-full rounded-lg" />

      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Save button */}
      <Skeleton className="h-12 w-full rounded-md" />

      {/* Family card */}
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
