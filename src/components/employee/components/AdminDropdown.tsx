'use client';

import { useState, useEffect } from 'react';
import { AdminClient } from '@/lib/types';
import { fetchAdminClients } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminDropdownProps {
  onEmployerSelect: (employerEmail: string, employerRecordId: string, employerName: string) => void;
  selectedEmployerName?: string;
}

export default function AdminDropdown({ onEmployerSelect, selectedEmployerName }: AdminDropdownProps) {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAdminClients();
        if (data) {
          setClients(data);
        } else {
          setError('Failed to load clients - no data received');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Error loading clients: ${errorMessage}`);
        console.error('Error loading admin clients:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  const handleSelect = (employerRecordId: string) => {
    const selectedClient = clients.find(client => client.employerRecordId === employerRecordId);
    if (selectedClient && selectedClient.employerEmail) {
      onEmployerSelect(selectedClient.employerEmail, selectedClient.employerRecordId, selectedClient.employerName);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">טוען לקוחות...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-red-600">שגיאה בטעינת לקוחות: {error}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4" dir="rtl">
      <span className="text-sm font-medium text-gray-700"><b>בחר מעסיק:</b></span>
      <Select onValueChange={handleSelect} value={selectedEmployerName ? clients.find(c => c.employerName === selectedEmployerName)?.employerRecordId : undefined}>
        <SelectTrigger className="w-64 bg-white text-right" dir="rtl">
          <SelectValue placeholder="בחר מעסיק מהרשימה" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {clients
            .sort((a, b) => a.employerName.localeCompare(b.employerName))
            .map((client) => (
              <SelectItem key={client.employerRecordId} value={client.employerRecordId}>
                {client.employerName}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
