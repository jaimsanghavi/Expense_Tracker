import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, monthly_budget_paise")
    .eq("id", user.id)
    .single();

  return (
    <ProfileForm
      email={user.email ?? ""}
      displayName={profile?.display_name ?? ""}
      monthlyBudgetPaise={profile?.monthly_budget_paise ?? null}
    />
  );
}
