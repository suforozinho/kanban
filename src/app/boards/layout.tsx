import { AppHeader } from "@/components/AppHeader";

export default function BoardsLayout({ children }: LayoutProps<"/boards">) {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      {children}
    </div>
  );
}
