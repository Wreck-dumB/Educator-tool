import Link from "next/link";
import { getChildren } from "@/lib/supabase/children";
import { createChild } from "@/app/(app)/children/actions";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const children = await getChildren();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Children</h1>
      <p className="mt-1 text-sm text-gray-500">
        Profiles you manage on behalf of the children in your care &mdash; no login for them,
        just a name, age, and what they&apos;re currently into.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">All children</h2>
        </div>
        {children.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No children added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {children.map((child) => (
              <li key={child.id} className="px-4 py-3">
                <Link
                  href={`/children/${child.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {child.first_name}
                </Link>
                {child.current_interests && (
                  <p className="mt-0.5 text-sm text-gray-500">{child.current_interests}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Add a child</h2>
        <form action={createChild} className="mt-4 space-y-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
              Date of birth (optional)
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="current_interests"
              className="block text-sm font-medium text-gray-700"
            >
              Current interests (optional)
            </label>
            <input
              id="current_interests"
              name="current_interests"
              type="text"
              placeholder="e.g. dinosaurs, trucks, drawing"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Feeds into activity generation when you pick this child.
            </p>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add child
          </button>
        </form>
      </div>
    </div>
  );
}
