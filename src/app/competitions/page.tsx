import { AppHeader } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { competitions } from '@/lib/data';

export default function CompetitionsPage() {
  const getBadgeVariant = (status: 'upcoming' | 'ongoing' | 'completed'): 'default' | 'outline' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'ongoing': return 'outline';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AppHeader showAddButton={true} addButtonLabel="Create Competition" />
      <main className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competition Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Participants</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitions.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.date}</TableCell>
                    <TableCell className="hidden md:table-cell">{comp.location}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(comp.status)}>{comp.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{comp.participants}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Manage</DropdownMenuItem>
                          <DropdownMenuItem>View Results</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">Cancel</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
