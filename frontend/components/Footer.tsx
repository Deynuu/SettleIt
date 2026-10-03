import Link from "next/link";
import { COPY } from "@/lib/settleit/constants";
import { BuildInfo } from "./BuildInfo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap stack">
        <p>{COPY.safety}</p>
        <p>{COPY.sensitive} {COPY.publishWarning}</p>
        <p>Runs on GenLayer StudioNet (test network). No backend, no accounts. <Link href="/verify">What am I using? What does this prove?</Link></p>
        <BuildInfo compact />
      </div>
    </footer>
  );
}
