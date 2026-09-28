import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[55vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">We couldn't find that page</h1>
      <p className="mt-3 max-w-md text-muted-foreground">The link may be outdated or the page may have moved.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild><Link href="/events">Browse events</Link></Button>
        <Button asChild variant="outline"><Link href="/">Go home</Link></Button>
      </div>
    </div>
  );
}
