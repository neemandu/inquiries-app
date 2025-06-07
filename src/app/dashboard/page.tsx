import { UserButton } from '@clerk/nextjs';

export default async function Dashboard() {

  return (
    <div className="min-h-screen bg-gray-50">
    this is dashboard

    <UserButton />

    </div>
  );
} 