
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      position="bottom-center"
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={1500}
      // Cap simultaneous visible toasts. Without this, rapid deletes
      // / saves stack 4-5 cards over the transport and block the
      // Stop/Play/Record buttons.
      visibleToasts={2}
      // Push the stack above the iPhone home indicator + mobile
      // bottom nav (~48px) + any sticky transport bars in Part Tracks
      // Studio (~80px). Sonner's `offset` accepts string|number, not
      // an object — value is the bottom inset.
      offset="144px"
      toastOptions={{
        duration: 1500,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          // Action button uses foreground/background instead of
          // primary/primary-foreground so the label stays readable
          // even on tenants whose --primary-foreground resolves to a
          // tone that blends with --primary (the demo tenant had
          // gold-on-gold "Delete" buttons that looked empty).
          actionButton:
            "group-[.toast]:bg-foreground group-[.toast]:text-background group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
