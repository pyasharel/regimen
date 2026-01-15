import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Search, ArrowUpDown } from 'lucide-react';

interface UserData {
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  lastActiveAt: string | null;
  subscriptionStatus: string;
  dosesLogged: number;
}

export const UserList = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof UserData>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Get all profiles with user stats
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`
            user_id,
            full_name,
            created_at,
            last_active_at,
            subscription_status
          `)
          .order('created_at', { ascending: false });

        if (!profiles) {
          setIsLoading(false);
          return;
        }

        // Get user stats for dose counts
        const { data: stats } = await supabase
          .from('user_stats')
          .select('user_id, total_doses_logged');

        const statsMap = new Map<string, number>();
        stats?.forEach(s => {
          statsMap.set(s.user_id, s.total_doses_logged || 0);
        });

        // Note: We can't access auth.admin.listUsers() from client side
        // Users' emails are stored in auth.users which requires service role
        // For now, we'll show profiles without emails (admin can check in Supabase dashboard)
        const userData: UserData[] = profiles.map(profile => ({
          userId: profile.user_id,
          email: 'Hidden', // Can't access from client
          name: profile.full_name || 'Anonymous',
          createdAt: profile.created_at || '',
          lastActiveAt: profile.last_active_at,
          subscriptionStatus: profile.subscription_status || 'none',
          dosesLogged: statsMap.get(profile.user_id) || 0
        }));

        setUsers(userData);
        setFilteredUsers(userData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    });

    setFilteredUsers(filtered);
  }, [searchTerm, users, sortField, sortDirection]);

  const handleSort = (field: keyof UserData) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-64 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Joined
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('lastActiveAt')}
                >
                  <div className="flex items-center gap-1">
                    Last Active
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer"
                  onClick={() => handleSort('dosesLogged')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Doses
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 50).map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {user.lastActiveAt 
                      ? format(new Date(user.lastActiveAt), 'MMM d, yyyy')
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-right">{user.dosesLogged}</TableCell>
                  <TableCell>{getStatusBadge(user.subscriptionStatus)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length > 50 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Showing 50 of {filteredUsers.length} users
          </p>
        )}
      </CardContent>
    </Card>
  );
};
