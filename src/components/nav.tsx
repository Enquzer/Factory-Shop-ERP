"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutDashboard, Package, ShoppingCart, User, ClipboardList, FileText, Bell, Factory, BarChart3, Tag, Users, FlaskConical, GanttChart, Scissors, ClipboardCheck, Palette, Layers } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { useResponsive } from '@/contexts/responsive-context';

const factoryLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders-analytics', label: 'Orders Analytics', icon: BarChart3 },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/products/categories', label: 'Category Management', icon: Tag },
  { href: '/inventory', label: 'Inventory', icon: ClipboardList },
  { href: '/raw-materials', label: 'Raw Materials', icon: Layers },
  { href: '/store/issue', label: 'Material Issuance', icon: ShoppingCart },
  { href: '/shops', label: 'Shops', icon: Building2 },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
  { href: '/order-planning', label: 'Order Planning', icon: GanttChart },
  { href: '/cutting', label: 'Cutting Department', icon: Scissors },
  { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
  { href: '/sample-management', label: 'Sample Management', icon: FlaskConical },
  { href: '/holiday-discounts', label: 'Holiday Discounts', icon: Tag },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings/telegram', label: 'Telegram Channels', icon: Bell },
  { href: '/users', label: 'User Management', icon: User }, // Using User icon instead of Users
  { href: '/store', label: 'Store Management', icon: Package },
  { href: '/finance', label: 'Finance Management', icon: FileText },
  { href: '/designer', label: 'Designer', icon: Palette },
  { href: '/profile', label: 'Profile', icon: User },
];

const storeLinks = [
  { href: '/store/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/store/receive', label: 'Receive Goods', icon: ClipboardCheck },
  { href: '/raw-materials', label: 'Raw Materials', icon: Layers },
  { href: '/store/issue', label: 'Material Issuance', icon: ShoppingCart },
  { href: '/store/inventory', label: 'Store Inventory', icon: Package },
  { href: '/store/orders', label: 'Shop Orders', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: User },
];

const financeLinks = [
  { href: '/finance', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/finance/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/finance/reports', label: 'Financial Reports', icon: FileText },
  { href: '/profile', label: 'Profile', icon: User },
];

const shopLinks = [
  { href: '/shop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shop/orders', label: 'My Orders', icon: ShoppingCart },
  { href: '/shop/products', label: 'Products', icon: Package },
  { href: '/shop/inventory', label: 'My Inventory', icon: ClipboardList },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const { isMobile, isTablet } = useResponsive();

  // Return null if user is not authenticated
  if (!user) {
    return null;
  }

  // Select appropriate links based on user role
  let currentLinks = factoryLinks;
  let userType = user.role;
  
  switch (user.role) {
    case 'store':
      currentLinks = storeLinks;
      userType = 'store';
      break;
    case 'finance':
      currentLinks = financeLinks;
      userType = 'finance';
      break;
    case 'shop':
      currentLinks = shopLinks;
      userType = 'shop';
      break;
    case 'planning':
    case 'cutting':
    case 'sewing':
    case 'finishing':
    case 'packing':
    case 'quality_inspection':
      // Different navigation for different production roles
      if (user.role === 'cutting') {
        currentLinks = [
          { href: '/cutting', label: 'Cutting Department', icon: Scissors },
          { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
          { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      } else if (user.role === 'quality_inspection') {
        currentLinks = [
          { href: '/quality-inspection', label: 'QC Dashboard', icon: LayoutDashboard },
          { href: '/quality-inspection?stage=Sample', label: 'Sample QC', icon: FlaskConical },
          { href: '/quality-inspection?stage=Sewing', label: 'Sewing QC', icon: Scissors },
          { href: '/quality-inspection?stage=Packing', label: 'Packing QC', icon: Package },
          { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
          { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      } else if (user.role === 'planning') {
        currentLinks = [
          { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
          { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
          { href: '/order-planning', label: 'Order Planning', icon: GanttChart },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      } else if (user.role === 'sewing') {
        currentLinks = [
          { href: '/sewing', label: 'Sewing Department', icon: Factory },
          { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
          { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      } else if (user.role === 'packing' || user.role === 'finishing') {
        currentLinks = [
          { href: '/packing', label: 'Packing Department', icon: Package },
          { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
          { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
          { href: '/profile', label: 'Profile', icon: User },
        ];

      } else {
        // Other production roles
        currentLinks = [
          { href: '/production-dashboard', label: 'Production Dashboard', icon: LayoutDashboard },
          { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
          { href: '/profile', label: 'Profile', icon: User },
        ];
      }
      userType = user.role;
      break;
    case 'marketing':
      currentLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
        { href: '/order-planning', label: 'Order Planning', icon: GanttChart },
        { href: '/products', label: 'Products', icon: Package },
        { href: '/reports', label: 'Reports', icon: FileText },
        { href: '/profile', label: 'Profile', icon: User },
      ];
      userType = 'marketing';
      break;
    case 'designer':
      currentLinks = [
        { href: '/designer', label: 'Designer Studio', icon: Palette },
        { href: '/sample-management', label: 'Sample Management', icon: FlaskConical },
        { href: '/marketing-orders', label: 'Marketing Orders', icon: Factory },
        { href: '/products', label: 'Product List', icon: Package },
        { href: '/profile', label: 'Profile', icon: User },
      ];
      userType = 'designer';
      break;
    case 'factory':
    default:
      currentLinks = factoryLinks;
      userType = 'factory';
      break;
  }

  // Fetch notifications based on user type
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userType=${userType}`);
        if (response.ok) {
          const notifications = await response.json();
          const unread = notifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    // Fetch notifications immediately
    fetchNotifications();

    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(fetchNotifications, 30000);

    // Cleanup subscription on component unmount
    return () => clearInterval(intervalId);
  }, [userType]);

  return (
    <SidebarMenu>
      {currentLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === link.href}
            tooltip={isMobile || isTablet ? link.label : undefined}
            className="justify-start"
          >
            <Link href={link.href}>
              <link.icon className="h-4 w-4" />
              <span>
                {link.label}
              </span>
              {link.href === '/orders' && unreadCount > 0 && (
                <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      {/* Add a separate notification item */}
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === '/notifications'}
          tooltip={isMobile || isTablet ? "Notifications" : undefined}
          className="justify-start"
        >
          <Link href="/orders">
            <Bell className="h-4 w-4" />
            <span>
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}