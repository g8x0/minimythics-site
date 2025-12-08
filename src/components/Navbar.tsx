import { Button } from "./ui/Button";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Top Utility Bar - Static (Scrolls away) */}
            <div className="relative z-50 bg-[#1C1C1E] text-white h-[40px] flex justify-between items-center px-4 md:px-8 font-heading">
                <div className="flex items-center">
                    {/* Branding Text */}
                    <span className="font-bold tracking-wider text-sm opacity-70 hover:opacity-100 transition-opacity cursor-default">
                        Thrusters United Inc.
                    </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium opacity-60">
                    <a href="#" className="hover:opacity-100 transition-opacity">FAQ & Support</a>
                    <div className="flex items-center gap-1 hover:opacity-100 transition-opacity cursor-pointer">
                        <Globe size={12} />
                        <span>English</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation Bar - Sticky (Follows scroll) */}
            <nav className="sticky top-0 z-40 bg-black/70 shadow-none transition-all duration-300 backdrop-blur-none border-none h-[77px] flex items-center font-heading">
                <div className="max-w-7xl mx-auto px-4 md:px-8 w-full flex items-center justify-between h-full">

                    {/* Logo Area - Resized to h-[85px] and centered (removed translation) */}
                    <div className="flex items-center gap-4 h-full">
                        <a href="#" className="block hover:scale-105 transition-transform duration-200 flex items-center">
                            <img
                                src="/images/logo3.png"
                                alt="Mini Mythics"
                                className="h-[85px] w-auto object-contain drop-shadow-md"
                            />
                        </a>
                    </div>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-8 h-full">
                        <NavLink label="GAME INFO" active />
                        <NavLink label="MEDIA" />
                        <NavLink label="COMMUNITY" />
                    </div>

                    {/* Actions - Empty for now */}
                    <div className="hidden md:flex items-center gap-4">
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-white hover:bg-white/10 rounded-xl"
                    >
                        {isOpen ? <X size={32} /> : <Menu size={32} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-[var(--color-paper)]/95 backdrop-blur-3xl pt-32 px-6 md:hidden animate-in fade-in slide-in-from-top-10 font-heading">
                    <div className="flex flex-col gap-6 items-center text-center">
                        <MobileLink label="GAME INFO" />
                        <MobileLink label="MEDIA" />
                        <MobileLink label="COMMUNITY" />
                        <div className="h-px w-20 bg-[var(--color-wood)]/20 my-2" />
                    </div>
                </div>
            )}
        </>
    );
}

function NavLink({ label, active }: { label: string, active?: boolean }) {
    return (
        <a
            href="#"
            className={`relative text-lg font-black tracking-wide transition-colors duration-200 h-full flex items-center px-2
        ${active ? "text-[var(--color-primary)]" : "text-[#d0c0a0] hover:text-[var(--color-primary)]"}
      `}
        >
            {label}
            {/* Active Dot */}
            {active && <span className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full" />}
        </a>
    );
}

function MobileLink({ label }: { label: string }) {
    return (
        <a href="#" className="font-heading font-black text-2xl text-[var(--color-wood)] hover:text-[var(--color-primary)]">
            {label}
        </a>
    );
}
