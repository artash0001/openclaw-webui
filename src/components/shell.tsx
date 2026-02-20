import { Nav } from "./nav";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
      </main>
    </>
  );
}
