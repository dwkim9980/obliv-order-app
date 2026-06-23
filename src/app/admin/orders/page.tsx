import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import AdminOrdersClient from "./AdminOrdersClient";

export default async function AdminOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/orders");

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar name={user.name} role={user.role} />
      <main className="flex-1 p-6">
        <AdminOrdersClient />
      </main>
    </div>
  );
}
