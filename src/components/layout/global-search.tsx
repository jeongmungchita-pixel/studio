'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Building, Trophy, FileText, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useFirestore, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { ROUTES } from '@/constants/routes';
import { Member } from '@/types/member';
import { Club } from '@/types/club';
import { GymnasticsCompetition } from '@/types/business';
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const firestore = useFirestore();
  // 데이터 로드 - 검색창이 열렸을 때만 로드 (최적화)
  const membersCollection = useMemoFirebase(() => 
    firestore && open ? collection(firestore, 'members') : null, 
    [firestore, open]
  );
  const clubsCollection = useMemoFirebase(() => 
    firestore && open ? collection(firestore, 'clubs') : null, 
    [firestore, open]
  );
  const competitionsCollection = useMemoFirebase(() => 
    firestore && open ? collection(firestore, 'competitions') : null, 
    [firestore, open]
  );
  const { data: members } = useCollection<Member>(membersCollection);
  const { data: clubs } = useCollection<Club>(clubsCollection);
  const { data: competitions } = useCollection<GymnasticsCompetition>(competitionsCollection);
  // 키보드 단축키 (Cmd+K 또는 Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  // 검색 결과 필터링
  const filteredMembers = members?.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) || [];
  const filteredClubs = clubs?.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) || [];
  const filteredCompetitions = competitions?.filter(comp =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5) || [];
  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    setSearchQuery('');
    router.push(path);
  }, [router]);
  return (
    <>
      <div className="relative flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="검색... (⌘K)"
          className="w-full rounded-lg bg-secondary pl-8 md:w-[200px] lg:w-[320px] cursor-pointer"
          onClick={() => setOpen(true)}
          readOnly
        />
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="회원, 클럽, 대회 검색..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
          {filteredMembers.length > 0 && (
            <CommandGroup heading="회원">
              {filteredMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  onSelect={() => handleSelect(ROUTES.DYNAMIC.MEMBER_DETAIL(member.id))}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{member.name}</span>
                  {member.email && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {filteredClubs.length > 0 && (
            <CommandGroup heading="클럽">
              {filteredClubs.map((club) => (
                <CommandItem
                  key={club.id}
                  onSelect={() => handleSelect(ROUTES.DYNAMIC.CLUB_DETAIL(club.id))}
                >
                  <Building className="mr-2 h-4 w-4" />
                  <span>{club.name}</span>
                  {club.location && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {`${club.location.latitude}, ${club.location.longitude}`}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {filteredCompetitions.length > 0 && (
            <CommandGroup heading="대회">
              {filteredCompetitions.map((comp) => (
                <CommandItem
                  key={comp.id}
                  onSelect={() => handleSelect(ROUTES.DYNAMIC.COMPETITION_DETAIL(comp.id))}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>{comp.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {comp.startDate ? new Date(comp.startDate).toLocaleDateString() : ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="빠른 이동">
            <CommandItem onSelect={() => handleSelect(ROUTES.DASHBOARD)}>
              <FileText className="mr-2 h-4 w-4" />
              <span>대시보드</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(ROUTES.MEMBERS)}>
              <Users className="mr-2 h-4 w-4" />
              <span>회원 목록</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(ROUTES.CLUBS)}>
              <Building className="mr-2 h-4 w-4" />
              <span>클럽 목록</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(ROUTES.COMPETITIONS)}>
              <Trophy className="mr-2 h-4 w-4" />
              <span>대회 목록</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
