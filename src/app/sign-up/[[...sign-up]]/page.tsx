import { SignUp } from '@clerk/nextjs';
import MobileJoinRequest from '@/components/auth/MobileJoinRequest';

export default function SignUpPage() {
  return (
    <>
      <MobileJoinRequest />
      <div className="hidden md:flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md">
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
              }
            }}
          />
        </div>
      </div>
    </>
  );
}
