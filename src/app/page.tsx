import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";
import Image from "next/image";

const backgroundImages = [
    { src: "https://picsum.photos/seed/prod1/400/500", alt: "Man wearing a classic tee", hint: "man t-shirt" },
    { src: "https://picsum.photos/seed/prod2/400/500", alt: "Woman in a summer dress", hint: "woman dress" },
    { src: "https://picsum.photos/seed/prod3/400/500", alt: "Kid wearing a graphic hoodie", hint: "kids hoodie" },
    { src: "https://picsum.photos/seed/prod4/400/500", alt: "Unisex denim jacket", hint: "denim jacket" },
    { src: "https://picsum.photos/seed/prod5/400/500", alt: "Man in a striped shirt", hint: "man shirt" },
    { src: "https://picsum.photos/seed/prod6/400/500", alt: "Woman wearing a jumpsuit", hint: "woman jumpsuit" },
    { src: "https://picsum.photos/seed/garment1/400/500", alt: "Close up of fabric texture", hint: "fabric texture" },
    { src: "https://picsum.photos/seed/garment2/400/500", alt: "Stack of folded jeans", hint: "jeans stack" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-4 h-full w-full">
        {backgroundImages.map((image, index) => (
          <div key={index} className="relative h-full w-full">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              data-ai-hint={image.hint}
            />
             <div className="absolute inset-0 bg-black/30"></div>
          </div>
        ))}
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <Card className="mx-auto max-w-sm w-full bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl text-center text-card-foreground">Welcome to Carement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button asChild size="lg">
              <Link href="/factory/login">Factory Login</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/shop/login">Shop Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
