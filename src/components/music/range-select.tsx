import Link from "next/link";
import { cn } from "@/lib/utils";

export function RangeSelect<T extends string>({options,value,href,label}: {options:{value:T;label:string}[];value:T;href:(v:T)=>string;label:string}) {
  return <nav aria-label={label} className="inline-flex max-w-full flex-wrap border border-strong">
    {options.map(o=><Link key={o.value} href={href(o.value)} scroll={false} aria-current={o.value === value ? "true" : undefined}
      className={cn("inline-flex min-h-11 items-center px-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none",o.value===value ? "bg-text text-ground" : "text-muted-text hover:bg-muted hover:text-text")}>{o.label}</Link>)}
  </nav>;
}
