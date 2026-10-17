import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  external?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
