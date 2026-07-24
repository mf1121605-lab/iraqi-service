import { audioFX } from '../../utils/audioFX';

export default function NavIcon3D({ icon: Icon, label, href, active, badge }) {
  return (
    <div className={badge > 0 ? 'animate-icon-bounce' : ''}>
      <a
        href={href}
        aria-label={label}
        onClick={() => audioFX.playNavTap()}
        className="relative flex flex-col items-center gap-0.5 group outline-none"
      >
        {/* 3D icon container */}
        <span
          className={`
            relative flex h-11 w-11 items-center justify-center rounded-2xl
            transition-all duration-200
            group-active:scale-90
            ${active
              ? `bg-gradient-to-b from-amber-500/35 to-amber-700/25
                 border border-amber-400/60
                 shadow-[0_0_22px_-4px_rgba(245,158,11,0.60),0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.22)]`
              : `bg-gradient-to-b from-white/10 to-white/4
                 border border-white/12
                 shadow-[0_4px_14px_rgba(0,0,0,0.5),0_1px_0_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.10)]
                 group-hover:from-white/14 group-hover:border-white/20
                 group-hover:shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.14)]`
            }
          `}
        >
          {/* Specular top-edge highlight */}
          <span className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-white/25" aria-hidden="true" />
          {/* Bottom shadow edge for depth */}
          <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px rounded-full bg-black/40" aria-hidden="true" />

          <Icon
            className={`h-[19px] w-[19px] transition-colors duration-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${
              active ? 'text-amber-300' : 'text-white/75 group-hover:text-white'
            }`}
            strokeWidth={active ? 2.2 : 1.8}
            aria-hidden="true"
          />

          {/* Badge */}
          {badge > 0 && (
            <span className="animate-scale-in absolute -top-1.5 -end-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0d1117]">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>

        {/* Label */}
        <span
          className={`text-[9px] font-medium leading-none tracking-tight ${
            active ? 'text-amber-400' : 'text-white/45 group-hover:text-white/65'
          }`}
        >
          {label}
        </span>
      </a>
    </div>
  );
}
