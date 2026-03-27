import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Props {
  title: string;
  content: string[];
}

export const HelpButton = ({ title, content }: Props) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="sm" className="text-muted-foreground" title="Aide">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle className="text-foreground">{title}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-3">
        {content.map((p, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);
