"use client";

import type { ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

/** Wraps the app so any client component can confirm a change with a toast. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <Toast.Provider timeout={4000} limit={3}>{children}<Toaster /></Toast.Provider>;
}

function Toaster() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      {/* Above the phone tab bar (h-16) and the home indicator; bottom-right on wider screens. */}
      <Toast.Viewport className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 outline-none md:inset-x-auto md:right-6 md:bottom-6 md:items-end">
        {toasts.map((toast) => (
          <Toast.Root key={toast.id} toast={toast} swipeDirection={["down", "right"]}
            className="flex w-full max-w-sm items-start gap-3 border border-strong bg-text p-3 text-ground shadow-lg transition-[opacity,transform] duration-200 ease-out data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 motion-reduce:transition-opacity motion-reduce:data-[ending-style]:translate-y-0 motion-reduce:data-[starting-style]:translate-y-0">
            <Toast.Content className="min-w-0 flex-1">
              <Toast.Title className="text-sm font-semibold" />
              <Toast.Description className="text-xs opacity-80" />
            </Toast.Content>
            <Toast.Close aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center hover:opacity-70"><X className="size-4" aria-hidden="true" /></Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

/** `notify("Era renamed")` from any client component under the provider. */
export function useNotify() {
  const { add } = Toast.useToastManager();
  return (title: string, description?: string) => { add({ title, description }); };
}

/** A server-action form that confirms success, or says it failed, with a toast. */
export function ActionForm({ action, success, className, children }: {
  action: (form: FormData) => Promise<void>; success: string; className?: string; children: ReactNode;
}) {
  const notify = useNotify();
  return (
    <form className={className} action={async (form) => {
      try {
        await action(form);
        notify(success);
      } catch {
        notify("That didn’t save", "Try again in a moment.");
      }
    }}>{children}</form>
  );
}
