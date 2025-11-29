'use client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Bell,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Files,
  LogOut,
  Pill,
  UserCircle,
  CalendarClock,
  Stethoscope,
  Building2
} from 'lucide-react';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Static data
const company = {
  name: 'PillSure',
  logo: Pill
};
import { useAuth } from '@/contexts/auth-context';
import type { User as AuthUser } from '@/lib/types';
function getNavItems(user: AuthUser | null) {
  const items = [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
      isActive: true
    },
    ...(user?.role === 'doctor'
      ? [{
          title: 'Appointments',
          url: '/dashboard/appointments',
          icon: CalendarClock
        }]
      : []),
    {
      title: 'Doctors',
      url: '/dashboard/admin/doctors',
      icon: Stethoscope
    },
    {
      title: 'Hospitals',
      url: '/dashboard/admin/hospitals',
      icon: Building2
    },
    {
      title: 'Medicines',
      url: '/dashboard/admin/medicines',
      icon: Pill
    },
    {
      title: 'Users',
      url: '/users',
      icon: Users
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings
    }
  ];
  return items;
}

// Types
interface User {
  name: string;
  email: string;
  avatar: string;
}

interface UserAvatarProfileProps {
  user: User;
  className?: string;
  showInfo?: boolean;
}

// Simple User Avatar Component
const UserAvatarProfile = ({ user, className, showInfo }: UserAvatarProfileProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-medium shadow-lg shrink-0">
        {user.name.charAt(0).toUpperCase()}
      </div>
      {showInfo && (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-[10px] text-current opacity-70">{user.email}</span>
        </div>
      )}
    </div>
  );
};

export default function AppSidebar() {
  const { state } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleNavigation = (url: string) => {
    router.push(url);
  };


  const handleSignOut = async () => {
    await logout();
    router.push('/auth');
  };

  // Fallback user if not loaded
  const displayUser = user
    ? {
        name: user.firstName + (user.lastName ? ' ' + user.lastName : ''),
        email: user.email,
        avatar: ''
      }
    : {
        name: 'User',
        email: '',
        avatar: ''
      };

  const navItems = getNavItems(user);
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className="flex items-center gap-2 sm:gap-3 p-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Pill className="h-4 w-4 text-white" />
          </div>
          {state !== 'collapsed' && (
            <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {company.name}
              </span>
              <span className="text-xs text-muted-foreground">Dashboard</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname?.startsWith(item.url));
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    onClick={() => handleNavigation(item.url)}
                  >
                    <Icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <UserAvatarProfile
                    className='h-8 w-8 rounded-lg'
                    showInfo
                    user={displayUser}
                  />
                  <ChevronRight className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    <UserAvatarProfile
                      className='h-8 w-8 rounded-lg'
                      showInfo
                      user={displayUser}
                    />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className='mr-2 h-4 w-4' />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}