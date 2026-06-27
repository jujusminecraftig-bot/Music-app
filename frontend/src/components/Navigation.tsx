'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Heart, Upload, Compass, User, Music2, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Discover', href: '/discover', icon: Compass },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Favorites', href: '/favorites', icon: Heart },
  { name: 'Playlists', href: '/playlists', icon: ListMusic },
  { name: 'Upload', href: '/upload', icon: Upload },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-64 h-screen flex flex-col p-5 fixed left-0 top-0 z-40 glass-strong border-r border-white/5">
      {/* Logo */}
      <div className="mb-8 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl btn-gradient flex items-center justify-center shadow-glow flex-shrink-0">
            <Music2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none gradient-text-lltm tracking-wide">LLTM</h1>
            <p className="text-[10px] text-muted mt-0.5 leading-none font-medium tracking-wider uppercase">LetsListenToMusic</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive
                  ? 'text-white'
                  : 'text-muted hover:text-white'
              )}
            >
              {/* Active background */}
              {isActive && (
                <div className="absolute inset-0 btn-gradient opacity-20 rounded-xl" />
              )}
              {/* Hover background */}
              <div className={cn(
                'absolute inset-0 rounded-xl transition-opacity duration-200',
                isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 bg-white/5'
              )} />

              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-400 to-pink-500 rounded-r-full" />
              )}

              <Icon
                size={18}
                className={cn(
                  'relative z-10 transition-all duration-200',
                  isActive ? 'text-white' : 'group-hover:text-white'
                )}
              />
              <span className={cn(
                'font-medium text-sm relative z-10 transition-all duration-200',
                isActive ? 'text-white' : ''
              )}>
                {item.name}
              </span>

              {/* New badge for Discover */}
              {item.name === 'Discover' && (
                <span className="ml-auto relative z-10 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white leading-none">
                  Free
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 my-4" />

      {/* Profile */}
      <Link
        href="/profile"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:text-white transition-all duration-200 group hover:bg-white/5"
      >
        <div className="w-7 h-7 rounded-full btn-gradient flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <User size={13} className="text-white" />
        </div>
        <span className="font-medium text-sm">Profile</span>
      </Link>
    </nav>
  );
}
