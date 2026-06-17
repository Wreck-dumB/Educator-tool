import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900">SparkPlay</h1>
      <p className="mt-4 max-w-md text-gray-600">
        Fun, EYLF-linked activity ideas for early childhood educators &mdash; generated
        from whatever you actually have on hand, with documentation built in.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
