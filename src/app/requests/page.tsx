import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as any;
  if (user.role !== "DEPARTMENT") redirect("/admin");

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
        <RequestsClient />
      </main>
    </div>
  );
}
