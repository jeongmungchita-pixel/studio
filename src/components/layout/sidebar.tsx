'use client';
import { usePathname, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  Building,
  Trophy,
  ClipboardList,
  Settings,
  LogOut,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import type { UserProfile } from '@/types';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/clubs', label: 'Clubs', icon: Building },
  { href: '/competitions', label: 'Competitions', icon: Trophy },
  { href: '/level-tests', label: 'Level Tests', icon: ClipboardList },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      redirect('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };
  
  const currentUser = user as UserProfile | null;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Trophy className="text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">KGF Nexus</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={isActive(item.href)}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2" />
      <SidebarFooter className="p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/settings">
                    <SidebarMenuButton isActive={isActive('/settings')} tooltip={{ children: 'Settings', side: 'right' }}>
                        <Settings />
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton onClick={handleLogout} tooltip={{ children: 'Log Out', side: 'right' }}>
                     <LogOut />
                     <span>Log Out</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
         </SidebarMenu>
        <Separator className="my-2"/>
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
            {isUserLoading ? (
                <div className="flex items-center gap-3 w-full">
                    <Loader2 className="w-4 h-4 animate-spin"/>
                    <span className="text-sm">Loading...</span>
                </div>
            ) : user ? (
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={currentUser?.photoURL} data-ai-hint="person portrait" />
                    <AvatarFallback>
                      {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{currentUser?.displayName}</span>
                    <span className="text-xs text-muted-foreground capitalize">{currentUser?.role}</span>
                </div>
            </div>
            ) : (
               <div className="flex items-center gap-3 w-full">
                 <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full">Log In</Button>
                 </Link>
               </div>
            )}
            {!isUserLoading && user && <ChevronDown className="w-4 h-4" />}
        </div>
      </SidebarFooter>
    </>
  );
}
