import { Navbar } from "../components/Navbar";

export function Media() {
    return (
        <div className="min-h-screen w-full relative bg-[var(--color-paper)]">
            <Navbar />
            <div className="pt-32 px-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h1 className="text-6xl font-heading font-extrabold text-[var(--color-dark)] mb-6 text-outline">
                    Media <span className="text-[var(--color-accent)]">Gallery</span>
                </h1>
                <p className="text-xl text-[var(--color-dark)]/70 font-medium">Coming Soon!</p>
            </div>
        </div>
    );
}
