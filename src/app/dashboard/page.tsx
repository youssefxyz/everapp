'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';  // Add this import
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };

    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <Link
              href="/chat" 
              className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
            >
              Go to Chat
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user.email}</h2>
          <p>You're successfully logged in!</p>
        </div>
      </div>
    </div>
  );
}