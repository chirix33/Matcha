import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-matcha-light to-white flex items-center justify-center p-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-matcha-dark mb-4">
          Welcome to Matcha
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          AI-Assisted Job Matching for Students and Early-Career Professionals
        </p>
        <p className="text-gray-600 mb-8">
          Create your profile without a traditional resume and discover job matches
          tailored to your skills and preferences.
        </p>
        <Link
          href="/profile"
          className="inline-block px-8 py-3 bg-matcha-primary text-white rounded-md font-semibold text-lg hover:bg-matcha-secondary transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}

