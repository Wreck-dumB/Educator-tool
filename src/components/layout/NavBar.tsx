import Link from "next/link";
import { logout } from "@/app/auth/actions";

export default function NavBar({ email }: { email: string }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/generate" className="text-lg font-bold text-gray-900">
          SparkPlay
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <Link href="/generate" className="hover:text-gray-900">
            Generate
          </Link>
          <Link href="/activities" className="hover:text-gray-900">
            Activities
          </Link>
          <Link href="/children" className="hover:text-gray-900">
            Children
          </Link>
          <Link href="/materials" className="hover:text-gray-900">
            Materials
          </Link>
          <Link href="/observations" className="hover:text-gray-900">
            Observations
          </Link>
          <span className="text-gray-400">{email}</span>
          <form action={logout}>
            <button type="submit" className="font-medium text-blue-600 hover:text-blue-500">
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
