import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 p-24">
      <h1 className="text-4xl font-bold">Welcome to lilProject!</h1>
      <Button>Get Started</Button>
    </div>
  );
}
