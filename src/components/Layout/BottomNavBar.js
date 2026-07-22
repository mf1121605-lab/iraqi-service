import NavIcon3D from '../UI/NavIcon3D';

export default function BottomNavBar({ navItems, badges }) {
  if (!navItems?.length) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 sm:hidden"
      aria-label="التنقل الرئيسي"
    >
      {/* Shimmer top border */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden" aria-hidden="true">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-500/55 to-transparent" />
      </div>

      {/* Glass panel */}
      <div className="bg-[#0d1117]/92 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-4px_32px_rgba(0,0,0,0.65),0_-1px_0_rgba(245,158,11,0.10)]">
        <div
          className="flex items-end justify-around px-1 pt-2"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {navItems.map((item) => (
            <NavIcon3D
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={item.active}
              badge={badges?.[item.href] ?? 0}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
