import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="w-full p-4 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Inquiries App</h1>
          <div className="flex items-center gap-4">
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10'
                  }
                }}
              />
            </SignedIn>
            <SignedOut>
              <div className="flex gap-2">
                <Link 
                  href="/sign-in"
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/sign-up"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-8">
        <SignedIn>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h2>
            <p className="text-gray-600">
              You&apos;re successfully signed in to your account.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Profile</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
                <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
                <p><strong>Joined:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

           
          </div>
        </SignedIn>

        <SignedOut>
          <div className="text-center py-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Welcome to Inquiries App
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A modern Next.js application with Clerk authentication. 
              Sign up or sign in to get started and explore all the features.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/sign-up"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
              <Link 
                href="/sign-in"
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  🔒
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure Authentication</h3>
                <p className="text-gray-600">
                  Powered by Clerk for enterprise-grade security and user management.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  ⚡
                </div>
                <h3 className="text-lg font-semibold mb-2">Fast & Modern</h3>
                <p className="text-gray-600">
                  Built with Next.js 14 and the latest web technologies for optimal performance.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  🎨
                </div>
                <h3 className="text-lg font-semibold mb-2">Beautiful UI</h3>
                <p className="text-gray-600">
                  Crafted with Tailwind CSS for a clean and responsive user experience.
                </p>
              </div>
            </div>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}
