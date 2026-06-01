import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { QuickAddFab } from "@/components/quick-add-fab";
import { getCategories } from "@/app/(app)/settings/categories/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const categories = await getCategories();

  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="mx-auto max-w-5xl px-4 pt-4 pb-24 md:px-8 md:pt-8">
          {children}
        </div>
      </main>
      <QuickAddFab categories={categories} />
    </div>
  );
}
