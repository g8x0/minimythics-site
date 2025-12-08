interface UnderConstructionProps {
    title?: string;
    message?: string;
    className?: string;
}

export function UnderConstruction({
    title = "Under Construction",
    message = "This page is currently under construction. Stay tuned!",
    className = "",
}: UnderConstructionProps) {
    return (
        <div className={`flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-amber-900/80 to-stone-900/90 backdrop-blur-sm rounded-xl border border-amber-500/30 shadow-lg ${className}`}>
            {/* Construction Barrier Icon */}
            <div className="flex-shrink-0">
                <svg
                    className="w-10 h-10"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Barrier posts */}
                    <rect x="8" y="48" width="6" height="12" rx="1" fill="#78716C" />
                    <rect x="50" y="48" width="6" height="12" rx="1" fill="#78716C" />

                    {/* Main barrier body */}
                    <rect x="4" y="20" width="56" height="28" rx="3" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />

                    {/* Diagonal stripes */}
                    <g clipPath="url(#barrier-clip)">
                        <path d="M0 20 L16 48 L24 48 L8 20 Z" fill="#EA580C" fillOpacity="0.8" />
                        <path d="M16 20 L32 48 L40 48 L24 20 Z" fill="#EA580C" fillOpacity="0.8" />
                        <path d="M32 20 L48 48 L56 48 L40 20 Z" fill="#EA580C" fillOpacity="0.8" />
                        <path d="M48 20 L64 48 L64 48 L56 20 Z" fill="#EA580C" fillOpacity="0.8" />
                    </g>

                    {/* Top bar */}
                    <rect x="4" y="16" width="56" height="6" rx="2" fill="#57534E" />

                    <defs>
                        <clipPath id="barrier-clip">
                            <rect x="4" y="20" width="56" height="28" rx="3" />
                        </clipPath>
                    </defs>
                </svg>
            </div>

            {/* Text */}
            <div className="text-center">
                <h3 className="text-base font-bold text-amber-300 mb-0.5">
                    {title}
                </h3>
                <p className="text-amber-100/70 text-xs max-w-[200px]">
                    {message}
                </p>
            </div>
        </div>
    );
}

export default UnderConstruction;
