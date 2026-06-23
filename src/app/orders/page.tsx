import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        name={user.name}
        role={user.role}
        branchName={user.branchName}
        centerName={user.centerName}
        departmentName={user.departmentName}
      />
      <main className="flex-1 p-6">
        <OrdersClient />
      </main>
    </div>
  );
}
