import { Shell } from "@/components/shell";
import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
