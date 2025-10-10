'use client';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/clubs', label: 'Clubs', icon: Building },
  { href: '/competitions', label: 'Competitions', icon: Trophy },
  { href: '/level-tests', label: 'Level Tests', icon: ClipboardList },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

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
              <Link href={item.href} passHref legacyBehavior>
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
                <Link href="/settings" passHref legacyBehavior>
                    <SidebarMenuButton isActive={isActive('/settings')} tooltip={{ children: 'Settings', side: 'right' }}>
                        <Settings />
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton tooltip={{ children: 'Log Out', side: 'right' }}>
                     <LogOut />
                     <span>Log Out</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
         </SidebarMenu>
        <Separator className="my-2"/>
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src="https://picsum.photos/seed/user-avatar/40/40" data-ai-hint="person portrait" />
                    <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">Jane Doe</span>
                    <span className="text-xs text-muted-foreground">Admin</span>
                </div>
            </div>
            <ChevronDown className="w-4 h-4" />
        </div>
      </SidebarFooter>
    </>
  );
}
