import { BlackToggle } from "@/components/BlackToggle";
import { Checker } from "@/components/Checker";

export default function Home() {
  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-semibold tracking-tight">
          Frame<span className="text-accent">Score</span>
        </span>
        <BlackToggle />
      </header>

      <div className="py-8 sm:py-12">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Will your PC run it?
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted sm:text-lg">
          Pick a game, tell us your hardware, and get a straight answer: what settings, roughly what frame rate, and how to make it better.
        </p>
      </div>

      <Checker />
    </div>
  );
}
