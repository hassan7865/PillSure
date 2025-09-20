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
  ImageIcon,
  UserCircle
} from 'lucide-react';
import * as React from 'react';

// Static data
const company = {
  name: 'PillSure',
  logo: ImageIcon
};

const staticUser = {
  name: 'John Doe',
  email: 'john.doe@acme.com',
  avatar: '/api/placeholder/32/32'
};

const navItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    isActive: true
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: BarChart3,
    items: [
      { title: 'Overview', url: '/analytics/overview' },
      { title: 'Reports', url: '/analytics/reports' },
      { title: 'Insights', url: '/analytics/insights' }
    ]
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users
  },
  {
    title: 'Files',
    url: '/files',
    icon: Files,
    items: [
      { title: 'Documents', url: '/files/documents' },
      { title: 'Images', url: '/files/images' },
      { title: 'Videos', url: '/files/videos' }
    ]
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings
  }
];

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
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
        {user.name.charAt(0)}
      </div>
      {showInfo && (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      )}
    </div>
  );
};

export default function AppSidebar() {
  const { state } = useSidebar();
  const [activeItem, setActiveItem] = React.useState('/dashboard');

  const handleNavigation = (url: string) => {
    setActiveItem(url);
    console.log('Navigate to:', url);
  };

  const handleProfileClick = () => {
    console.log('Navigate to profile');
  };

  const handleBillingClick = () => {
    console.log('Navigate to billing');
  };

  const handleNotificationsClick = () => {
    console.log('Navigate to notifications');
  };

  const handleSignOut = () => {
    console.log('Sign out user');
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <ImageIcon className="h-6 w-6" />
          {state !== 'collapsed' && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">{company.name}</span>
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
              return item?.items && item?.items?.length > 0 ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={item.isActive}
                  className='group/collapsible'
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={activeItem === item.url}
                        onClick={() => handleNavigation(item.url)}
                      >
                        {Icon && <Icon />}
                        <span>{item.title}</span>
                        <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              isActive={activeItem === subItem.url}
                              onClick={() => handleNavigation(subItem.url)}
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={activeItem === item.url}
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
                    user={staticUser}
                  />
                  <ChevronRight className='ml-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                side='bottom'
                align='end'
                sideOffset={4}
              >
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='px-1 py-1.5'>
                    <UserAvatarProfile
                      className='h-8 w-8 rounded-lg'
                      showInfo
                      user={staticUser}
                    />
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <UserCircle className='mr-2 h-4 w-4' />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBillingClick}>
                    <CreditCard className='mr-2 h-4 w-4' />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNotificationsClick}>
                    <Bell className='mr-2 h-4 w-4' />
                    Notifications
                  </DropdownMenuItem>
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