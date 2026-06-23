import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import PasswordForm from "./PasswordForm";

export default async function AccountPage() {
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
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">비밀번호 변경</h2>
          <PasswordForm />
        </div>
      </main>
    </div>
  );
}
