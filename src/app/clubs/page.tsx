import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MapPin } from 'lucide-react';
import { clubs } from '@/lib/data';

export default function ClubsPage() {
  return (
    <main className="flex-1 p-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clubs.map((club) => (
          <Card key={club.id} className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-center gap-4">
              <Image
                src={club.logo}
                alt={`${club.name} 로고`}
                width={64}
                height={64}
                className="rounded-lg border"
                data-ai-hint="logo abstract"
              />
              <div>
                <CardTitle>{club.name}</CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3"/> {club.location}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
               <div className="text-sm text-muted-foreground">
                 <p>코치: {club.coach}</p>
               </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>회원 {club.members}명</span>
              </div>
              <Link href={`/clubs/${club.id}`} passHref>
                <Button variant="outline" size="sm">상세보기</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
