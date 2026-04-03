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
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Pill,
  CalendarClock,
  Stethoscope,
  Building2,
  Layers
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
import { getDashboardHomeByRole, normalizeRole } from '@/lib/role-routing';
import { cn } from '@/lib/utils';
function getNavItems(user: AuthUser | null) {
  const role = normalizeRole(user?.role);

  if (role === 'doctor') {
    return [
      {
        title: 'Dashboard',
        url: getDashboardHomeByRole(role),
        icon: LayoutDashboard,
        isActive: true
      },
      {
        title: 'Appointments',
        url: '/dashboard/appointments',
        icon: CalendarClock
      }
    ];
  }

  if (role === 'hospital') {
    return [
      {
        title: 'Dashboard',
        url: getDashboardHomeByRole(role),
        icon: LayoutDashboard,
        isActive: true
      }
    ];
  }

  if (role === 'admin') {
    return [
      {
        title: 'Dashboard',
        url: getDashboardHomeByRole(role),
        icon: LayoutDashboard,
        isActive: true
      },
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
        title: 'Categories',
        url: '/dashboard/admin/categories',
        icon: Layers
      },
      {
        title: 'Orders',
        url: '/dashboard/admin/orders',
        icon: CreditCard
      }
    ];
  }

  return [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: LayoutDashboard,
      isActive: true
    }
  ];
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

// Avatar + text for sidebar footer (do not put fixed h/w on the root — it clips name/email).
const UserAvatarProfile = ({ user, className, showInfo }: UserAvatarProfileProps) => {
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-2', className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-medium text-white shadow-lg">
        {user.name.charAt(0).toUpperCase()}
      </div>
      {showInfo && (
        <div className="group-data-[collapsible=icon]:hidden flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden text-left">
          <span className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</span>
          {user.email ? (
            <span className="truncate text-xs text-muted-foreground" title={user.email}>
              {user.email}
            </span>
          ) : null}
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
  const normalizedPath = pathname ? pathname.replace(/\/+$/, '') || '/' : '/';
  const activeUrl =
    navItems
      .map((item) => item.url.replace(/\/+$/, '') || '/')
      .filter((url) => normalizedPath === url || normalizedPath.startsWith(`${url}/`))
      .sort((a, b) => b.length - a.length)[0] || null;

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className="flex items-center gap-2 sm:gap-3 p-2 cursor-pointer" onClick={() => router.push(getDashboardHomeByRole(user?.role))}>
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
              const itemUrl = item.url.replace(/\/+$/, '') || '/';
              const isActive = activeUrl === itemUrl;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    onClick={() => handleNavigation(item.url)}
                    className="cursor-pointer"
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
                  tooltip={
                    state === 'collapsed'
                      ? {
                          children: (
                            <div className="flex max-w-[240px] flex-col gap-0.5 text-left">
                              <span className="font-medium leading-tight">{displayUser.name}</span>
                              {displayUser.email ? (
                                <span className="break-all text-xs text-muted-foreground">{displayUser.email}</span>
                              ) : null}
                            </div>
                          ),
                        }
                      : undefined
                  }
                  className={cn(
                    'gap-1',
                    // Neutral hover/open — avoid full sidebar-accent (purple) fill
                    'hover:bg-muted/80 hover:text-sidebar-foreground',
                    'active:bg-muted/90 dark:hover:bg-white/10 dark:active:bg-white/[0.12]',
                    'data-[state=open]:bg-muted/80 data-[state=open]:text-sidebar-foreground',
                    'dark:data-[state=open]:bg-white/10'
                  )}
                >
                  <UserAvatarProfile showInfo user={displayUser} />
                  <ChevronRight className="group-data-[collapsible=icon]:hidden ml-auto size-4 shrink-0 opacity-70" />
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
                    <UserAvatarProfile showInfo user={displayUser} />
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