import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardHomeWithSidebar from "./components/DashboardHomeWithSidebar";
import DashboardLayout from "./components/DashboardLayout";

// Force dynamic rendering to prevent static generation issues with cookies
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <DashboardLayout>
      <DashboardHomeWithSidebar />
    </DashboardLayout>
  );
}
