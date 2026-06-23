import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "DEPARTMENT";
  departmentId: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}
