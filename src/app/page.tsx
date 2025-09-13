import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button asChild>
            <Link href="/factory/login">Factory Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop/login">Shop Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
