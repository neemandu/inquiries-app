import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default async function Dashboard() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-gray-50">
    this is dashboard

    <UserButton />

    </div>
  );
} 