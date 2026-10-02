import { COPY } from "@/lib/settleit/constants";
export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap stack">
        <p>{COPY.safety}</p>
        <p>{COPY.sensitive} {COPY.publishWarning}</p>
        <p>Runs on GenLayer StudioNet (test network). No backend, no accounts.</p>
      </div>
    </footer>
  );
}
